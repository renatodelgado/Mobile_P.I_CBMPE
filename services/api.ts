import { uploadToCloudinary } from "../utils/uploadToCloudinary";

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export const IP_DA_SUA_MAQUINA = "192.168.0.58";

const BASE_URL = "https://backendpicbmpe-production-d86d.up.railway.app";

/** -------------------------
 * Tipagens básicas (podem ampliar conforme a API)
 * ------------------------- */
export interface Usuario {
  id: number;
  nome?: string;
  matricula?: string;
  email?: string;
  patente?: string;
  funcao?: string;
  status?: boolean;
  [k: string]: any;
}

export interface Localizacao {
  id?: number;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  pontoReferencia?: string;
  latitude?: string;
  longitude?: string;
  [k: string]: any;
}

export interface Viatura {
  id?: number;
  tipo?: string;
  numero?: string;
  placa?: string;
  [k: string]: any;
}

export interface NaturezaOcorrencia {
  id?: number;
  nome?: string;
  [k: string]: any;
}

export interface Anexo {
  id?: number;
  urlArquivo?: string;
  nomeArquivo?: string;
  extensaoArquivo?: string;
  tipoArquivo?: string;
  dataCriacao?: string;
  [k: string]: any;
}

export interface OcorrenciaAPI {
  id: number;
  numeroOcorrencia?: string;
  dataHoraChamada?: string;
  statusAtendimento?: string;
  motivoNaoAtendimento?: string;
  descricao?: string;
  formaAcionamento?: string;
  dataSincronizacao?: string;
  createdAt?: string;
  updatedAt?: string;
  naturezaOcorrencia?: NaturezaOcorrencia | null;
  grupoOcorrencia?: any | null;
  subgrupoOcorrencia?: any | null;
  viatura?: Viatura | null;
  localizacao?: Localizacao | null;
  usuario?: Usuario | null;
  unidadeOperacional?: any | null;
  eventoEspecial?: any | null;
  anexos?: Anexo[];
  [k: string]: any;
}

/** -------------------------
 * Helpers
 * ------------------------- */

let authToken: string | null = null;

// In-memory cache to avoid repeated AsyncStorage reads during a session
const MEMORY_CACHE = new Map<string, any>();

async function requestJson(url: string, options: RequestInit = {}, timeout = 30000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
      // attach status for callers
      (err as any).status = res.status;
      throw err;
    }
    // tenta parsear json, se não for json, devolve texto
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    return res.text();
  } catch (err) {
    clearTimeout(id);
    // Re-lança o erro para o caller decidir
    throw err;
  }
}

/**
 * Safe wrapper around requestJson for read-only calls used by the UI.
 * If device is offline or the request fails with a network error, returns
 * the provided defaultValue (usually [] or null) instead of throwing/logging.
 */
async function safeRequestJson(url: string, options: RequestInit = {}, timeout = 30000, defaultValue: any = null): Promise<any> {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return defaultValue;
  } catch {
    // if NetInfo fails, proceed and let requestJson handle errors
  }

  try {
    return await requestJson(url, options, timeout);
  } catch (err: any) {
    const msg = String(err?.message || err || '').toLowerCase();
    // Treat AbortError/timeouts and common fetch network errors as silent network failures
    if (
      err?.name === 'AbortError' ||
      msg.includes('aborted') ||
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror')
    ) {
      // optionally warn in dev for easier debugging
      if (__DEV__) console.warn(`Request aborted/network error for ${url}:`, err?.message || err);
      return defaultValue;
    }

    // For other errors, log to help diagnose server/client issues
    console.error(`Erro na API ${url}:`, err);
    return defaultValue;
  }
}

/** -------------------------
 * Ocorrências
 * ------------------------- */

/** Buscar todas as ocorrências (sem filtros complexos) */
export async function fetchOcorrencias(): Promise<OcorrenciaAPI[]> {
  try {
    const key = `@app:cache:ocorrencias_v1`;

    // 1) Try in-memory cache first
    if (MEMORY_CACHE.has(key)) {
      // Kick off a background refresh but return cached immediately for snappy UI
      (async () => {
        try {
          const url = `${BASE_URL}/ocorrencias`;
          const res = await safeRequestJson(url, {}, 30000, null);
          const data = Array.isArray(res) ? res : [];
          if (data && Array.isArray(data)) {
            MEMORY_CACHE.set(key, data);
            try { await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data })); } catch {}
          }
        } catch (e) { /* background refresh failure - ignore */ }
      })();

      return MEMORY_CACHE.get(key) as OcorrenciaAPI[];
    }

    // 2) Try AsyncStorage cache next (fastish) and also trigger background refresh
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        const arr = Array.isArray(parsed?.data) ? parsed.data : [];
        // store in memory for subsequent fast reads
        MEMORY_CACHE.set(key, arr);

        // refresh in background
        (async () => {
          try {
            const url = `${BASE_URL}/ocorrencias`;
            const res = await safeRequestJson(url, {}, 30000, null);
            const data = Array.isArray(res) ? res : [];
            if (data && Array.isArray(data)) {
              MEMORY_CACHE.set(key, data);
              try { await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data })); } catch {}
            }
          } catch (e) { /* ignore */ }
        })();

        return arr as OcorrenciaAPI[];
      }
    } catch (e) {
      // ignore AsyncStorage read errors and continue to network attempt
    }

    // 3) No cache available: perform network request and cache result
    const url = `${BASE_URL}/ocorrencias`;
    const res = await safeRequestJson(url, {}, 30000, null);
    const data = Array.isArray(res) ? res : [];

    // cache results (best-effort) under a generic key
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data }));
      MEMORY_CACHE.set(key, data);
    } catch (e) {
      // ignore cache write failures
    }

    return data;
  } catch (error) {
    // safeRequestJson already handles logging; fallback empty
    return [];
  }
}

/** Buscar ocorrência por ID (rota: GET /ocorrencias/:id) */
export async function getOcorrenciaPorId(id: string | number): Promise<OcorrenciaAPI | null> {
  try {
    // Guard: avoid requesting invalid ids (e.g. route params like "new").
    // Accept numeric IDs, UUIDs or negative temp ids — don't reject non-numeric here.
    const sid = String(id || "").trim();
    if (!sid || sid.toLowerCase() === "new") {
      return null;
    }
    // If offline, try to find occurrence in cache first
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        const gen = await AsyncStorage.getItem('@app:cache:ocorrencias_v1');
        if (gen) {
          const parsed = JSON.parse(gen);
          const arr = Array.isArray(parsed?.data) ? parsed.data : [];
          const found = arr.find((o: any) => String(o?.id) === sid || String(o?.numeroOcorrencia) === sid || String(o?.numeroOcorrencia) === (`#${sid}`) || String(o?.numeroOcorrencia) === (`OCR${sid}`));
          if (found) {
            console.log('[api] getOcorrenciaPorId: found in generic cache', { id: sid, foundId: found.id, numero: found.numeroOcorrencia });
            return found as OcorrenciaAPI;
          }
        }
        // also try user-specific cache pattern
        // NOTE: without user id here we can't know the user cache key; fallback to generic
      }
    } catch (e) {
      // ignore
    }

    const raw = await safeRequestJson(`${BASE_URL}/ocorrencias/${encodeURIComponent(String(id))}`, {}, 15000, null);
    if (raw) return raw as OcorrenciaAPI;

    // If server didn't return a result, try to find it in local cache
    try {
      const keyPattern = '@app:cache:ocorrencias_usuario_v1_';
      // scan possible cached keys (simple approach: try user-specific caches not available here)
      // try generic occurrences cache first
      const gen = await AsyncStorage.getItem('@app:cache:ocorrencias_v1');
      if (gen) {
        const parsed = JSON.parse(gen);
        const arr = Array.isArray(parsed?.data) ? parsed.data : [];
        const found = arr.find((o: any) => String(o?.id) === sid || String(o?.numeroOcorrencia) === sid || String(o?.numeroOcorrencia) === (`#${sid}`) || String(o?.numeroOcorrencia) === (`OCR${sid}`));
        if (found) {
          console.log('[api] getOcorrenciaPorId: found in generic cache after network', { id: sid, foundId: found.id, numero: found.numeroOcorrencia });
          return found as OcorrenciaAPI;
        }
      }

      // if not found in generic cache, scan per-user caches
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const userKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('@app:cache:ocorrencias_usuario_v1_'));
        for (const k of userKeys) {
          try {
            const raw = await AsyncStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed?.data) ? parsed.data : [];
            const found = arr.find((o: any) => String(o?.id) === String(id));
            if (found) return found as OcorrenciaAPI;
          } catch (e) {
            // ignore and continue
          }
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore cache read errors
    }

    return null;
  } catch (error) {
    return null;
  }
}

/** Buscar ocorrências do usuário (rota existente) */
export async function fetchOcorrenciasUsuario(usuarioId: number): Promise<OcorrenciaAPI[]> {
  try {
    const key = `@app:cache:ocorrencias_usuario_v1_${usuarioId}`;

    // Fast path: memory cache
    if (MEMORY_CACHE.has(key)) {
      // background refresh
      (async () => {
        try {
          const created = await safeRequestJson(`${BASE_URL}/ocorrencias/usuario/${usuarioId}`, {}, 20000, []);
          const allFallback = await safeRequestJson(`${BASE_URL}/ocorrencias`, {}, 20000, []);
          const memberRaw = await safeRequestJson(`${BASE_URL}/ocorrencia-user/user/${usuarioId}/ocorrencias`, {}, 20000, []);
          // combine (reuse existing logic below) by calling the original function body via a small inline helper
          const result = await (async () => {
            const arrCreated = Array.isArray(created) ? created : [];
            const createdFromAll = Array.isArray(allFallback)
              ? allFallback.filter((o: any) => (o.usuario && (o.usuario.id === usuarioId || Number(o.usuario.id) === usuarioId)) || Number(o.usuarioId) === usuarioId)
              : [];
            const memberIds = Array.isArray(memberRaw) ? memberRaw.flatMap((m: any) => {
              const ids: number[] = [];
              if (m == null) return [];
              if (typeof m.ocorrenciaId === 'number' || (!isNaN(Number(m.ocorrenciaId)) && m.ocorrenciaId !== undefined)) ids.push(Number(m.ocorrenciaId));
              if (typeof m.ocorrencia_id === 'number' || (!isNaN(Number(m.ocorrencia_id)) && m.ocorrencia_id !== undefined)) ids.push(Number(m.ocorrencia_id));
              if (typeof m.id === 'number' || (!isNaN(Number(m.id)) && m.id !== undefined)) ids.push(Number(m.id));
              if (m.ocorrencia && typeof m.ocorrencia === 'object' && (m.ocorrencia.id || m.ocorrencia.ocorrenciaId)) {
                const v = m.ocorrencia.id ?? m.ocorrencia.ocorrenciaId;
                if (!isNaN(Number(v))) ids.push(Number(v));
              }
              if (m.ocorrencia && (typeof m.ocorrencia === 'number' || !isNaN(Number(m.ocorrencia)))) ids.push(Number(m.ocorrencia));
              return ids;
            }).filter(Boolean) : [];

            let memberFull: OcorrenciaAPI[] = [];
            if (memberIds.length > 0) {
              const promises = memberIds.map(id => getOcorrenciaPorId(id).catch(() => null));
              const results = await Promise.all(promises);
              memberFull = results.filter(Boolean) as OcorrenciaAPI[];
            }

            const allOcorrencias = [...(arrCreated || []), ...(createdFromAll || []), ...(memberFull || [])];
            const mapa = new Map<number, OcorrenciaAPI>();
            allOcorrencias.forEach(o => { if (o?.id) mapa.set(o.id, o); });
            return Array.from(mapa.values());
          })();

          MEMORY_CACHE.set(key, result);
          try { await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data: result })); } catch {}
        } catch (e) { /* ignore background refresh errors */ }
      })();

      return MEMORY_CACHE.get(key) as OcorrenciaAPI[];
    }

    // Next: AsyncStorage cache
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed?.data) ? parsed.data : [];
        MEMORY_CACHE.set(key, arr);

        // refresh in background (same logic as normal network path)
        (async () => {
          try {
            const created = await safeRequestJson(`${BASE_URL}/ocorrencias/usuario/${usuarioId}`, {}, 20000, []);
            const allFallback = await safeRequestJson(`${BASE_URL}/ocorrencias`, {}, 20000, []);
            const memberRaw = await safeRequestJson(`${BASE_URL}/ocorrencia-user/user/${usuarioId}/ocorrencias`, {}, 20000, []);
            const arrCreated = Array.isArray(created) ? created : [];
            const createdFromAll = Array.isArray(allFallback)
              ? allFallback.filter((o: any) => (o.usuario && (o.usuario.id === usuarioId || Number(o.usuario.id) === usuarioId)) || Number(o.usuarioId) === usuarioId)
              : [];
            const memberIds = Array.isArray(memberRaw) ? memberRaw.flatMap((m: any) => {
              const ids: number[] = [];
              if (m == null) return [];
              if (typeof m.ocorrenciaId === 'number' || (!isNaN(Number(m.ocorrenciaId)) && m.ocorrenciaId !== undefined)) ids.push(Number(m.ocorrenciaId));
              if (typeof m.ocorrencia_id === 'number' || (!isNaN(Number(m.ocorrencia_id)) && m.ocorrencia_id !== undefined)) ids.push(Number(m.ocorrencia_id));
              if (typeof m.id === 'number' || (!isNaN(Number(m.id)) && m.id !== undefined)) ids.push(Number(m.id));
              if (m.ocorrencia && typeof m.ocorrencia === 'object' && (m.ocorrencia.id || m.ocorrencia.ocorrenciaId)) {
                const v = m.ocorrencia.id ?? m.ocorrencia.ocorrenciaId;
                if (!isNaN(Number(v))) ids.push(Number(v));
              }
              if (m.ocorrencia && (typeof m.ocorrencia === 'number' || !isNaN(Number(m.ocorrencia)))) ids.push(Number(m.ocorrencia));
              return ids;
            }).filter(Boolean) : [];

            let memberFull: OcorrenciaAPI[] = [];
            if (memberIds.length > 0) {
              const promises = memberIds.map(id => getOcorrenciaPorId(id).catch(() => null));
              const results = await Promise.all(promises);
              memberFull = results.filter(Boolean) as OcorrenciaAPI[];
            }

            const allOcorrencias = [...(arrCreated || []), ...(createdFromAll || []), ...(memberFull || [])];
            const mapa = new Map<number, OcorrenciaAPI>();
            allOcorrencias.forEach(o => { if (o?.id) mapa.set(o.id, o); });
            const result = Array.from(mapa.values());

            MEMORY_CACHE.set(key, result);
            try { await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data: result })); } catch {}
          } catch (e) { /* ignore */ }
        })();

        return arr as OcorrenciaAPI[];
      }
    } catch (e) {
      // ignore and proceed to network
    }

    // 1. Ocorrências criadas pelo usuário
    const created = await safeRequestJson(`${BASE_URL}/ocorrencias/usuario/${usuarioId}`, {}, 20000, []);
    try {
    } catch {}

    // 1b. fallback: alguns backends não expõem /ocorrencias/usuario/:id —
    // buscar todas e filtrar por campo usuarioId / usuario?.id
    const allFallback = await safeRequestJson(`${BASE_URL}/ocorrencias`, {}, 20000, []);
    const createdFromAll = Array.isArray(allFallback)
      ? allFallback.filter((o: any) => (o.usuario && (o.usuario.id === usuarioId || Number(o.usuario.id) === usuarioId)) || Number(o.usuarioId) === usuarioId)
      : [];
    try {
    } catch {}

    // 2. Ocorrências em que ele é membro da equipe (apenas IDs + dados básicos)
    const memberRaw = await safeRequestJson(`${BASE_URL}/ocorrencia-user/user/${usuarioId}/ocorrencias`, {}, 20000, []);
    try {
      // log suppressed in production
    } catch {}

    const memberIds = Array.isArray(memberRaw)
      ? memberRaw.flatMap((m: any) => {
          const ids: number[] = [];
          // common shapes: { ocorrenciaId }, { ocorrencia_id }, { id }, { ocorrencia: { id } }, { ocorrencia: 123 }
          if (m == null) return [];
          if (typeof m.ocorrenciaId === 'number' || (!isNaN(Number(m.ocorrenciaId)) && m.ocorrenciaId !== undefined)) ids.push(Number(m.ocorrenciaId));
          if (typeof m.ocorrencia_id === 'number' || (!isNaN(Number(m.ocorrencia_id)) && m.ocorrencia_id !== undefined)) ids.push(Number(m.ocorrencia_id));
          if (typeof m.id === 'number' || (!isNaN(Number(m.id)) && m.id !== undefined)) ids.push(Number(m.id));
          if (m.ocorrencia && typeof m.ocorrencia === 'object' && (m.ocorrencia.id || m.ocorrencia.ocorrenciaId)) {
            const v = m.ocorrencia.id ?? m.ocorrencia.ocorrenciaId;
            if (!isNaN(Number(v))) ids.push(Number(v));
          }
          if (m.ocorrencia && (typeof m.ocorrencia === 'number' || !isNaN(Number(m.ocorrencia)))) ids.push(Number(m.ocorrencia));
          return ids;
        }).filter(Boolean)
      : [];

    try {
    } catch {}

    // 3. Buscar detalhes completos das ocorrências de equipe (se existirem IDs)
    let memberFull: OcorrenciaAPI[] = [];
    if (memberIds.length > 0) {
      const promises = memberIds.map(id =>
        getOcorrenciaPorId(id).catch(() => null)
      );
      const results = await Promise.all(promises);
      memberFull = results.filter(Boolean) as OcorrenciaAPI[];
    }

    const arrCreated = Array.isArray(created) ? created : [];
    // combine created (explicit), createdFromAll (fallback) and memberFull (equipe)
    const allOcorrencias = [...arrCreated, ...createdFromAll, ...memberFull];

    // Remover duplicatas por ID
    const mapa = new Map<number, OcorrenciaAPI>();
    allOcorrencias.forEach(o => {
      if (o?.id) mapa.set(o.id, o);
    });

    try {
    } catch {}

    const result = Array.from(mapa.values());

    // write to cache (do not overwrite with empty array if we have a previous cache)
    try {
      const key = `@app:cache:ocorrencias_usuario_v1_${usuarioId}`;
      const prevRaw = await AsyncStorage.getItem(key);
      const prev = prevRaw ? JSON.parse(prevRaw).data : null;
      if (!(Array.isArray(result) && result.length === 0 && prev != null)) {
        await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data: result }));
      }
    } catch (e) {
      // ignore cache write failures
    }

    return result;
  } catch (error) {
    // on error, try to return cached occurrences for this user
    try {
      const key = `@app:cache:ocorrencias_usuario_v1_${usuarioId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.data) ? parsed.data : [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}

/** Buscar ocorrências com filtro de período (dataInicio/dataFim) */
export async function fetchOcorrenciasComFiltro(periodo?: { inicio: string; fim: string }): Promise<OcorrenciaAPI[]> {
  try {
    let url = `${BASE_URL}/ocorrencias`;
    if (periodo?.inicio && periodo?.fim) {
      url += `?dataInicio=${encodeURIComponent(periodo.inicio)}&dataFim=${encodeURIComponent(periodo.fim)}`;
    }
    return await safeRequestJson(url, {}, 30000, []);
  } catch (error) {
    return [];
  }
}

/** Buscar ocorrências por natureza (aceita naturezaId numérico) */
export async function fetchOcorrenciasPorNatureza(naturezaId: number, periodo?: { inicio: string; fim: string }): Promise<OcorrenciaAPI[]> {
  try {
    let url = `${BASE_URL}/ocorrencias?naturezaId=${encodeURIComponent(String(naturezaId))}`;
    if (periodo?.inicio && periodo?.fim) {
      url += `&dataInicio=${encodeURIComponent(periodo.inicio)}&dataFim=${encodeURIComponent(periodo.fim)}`;
    }
    return await safeRequestJson(url, {}, 30000, []);
  } catch (error) {
    return [];
  }
}

/** Postar ocorrência (criação) */
export async function postOcorrencia(payload: any): Promise<any> {
  try {
    const body = { ...payload, formaAcionamento: payload?.formaAcionamento ?? 'aplicativo' };
    return await requestJson(`${BASE_URL}/ocorrencias`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    // do not spam console with network errors while offline; rethrow for callers to handle
    throw error;
  }
}

/** Postar ocorrência com timeout configurável (útil para offline sync) */
export async function postOcorrenciaComTimeout(payload: any, timeout = 30000): Promise<any> {
  try {
    const body = { ...payload, formaAcionamento: payload?.formaAcionamento ?? 'aplicativo' };
    return await requestJson(`${BASE_URL}/ocorrencias`, {
      method: "POST",
      body: JSON.stringify(body),
    }, timeout);
  } catch (error) {
    // rethrow and let caller decide how to log/alert
    throw error;
  }
}

/** -------------------------
 * Vítimas
 * ------------------------- */

export async function postVitima(payload: any): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/vitimas/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro na API de post vítima:", error);
    throw error;
  }
}

export async function postVitimaComTimeout(payload: any, timeout = 15000): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/vitimas/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, timeout);
  } catch (error) {
    console.error("Erro na API de post vítima com timeout:", error);
    throw error;
  }
}

/** Buscar vítimas por ocorrência (rota: GET /vitimas/:ocorrenciaId) */
export async function fetchVitimasPorOcorrencia(ocorrenciaId: string | number): Promise<any[]> {
  try {
    const sid = String(ocorrenciaId || "").trim();
    if (!sid || sid.toLowerCase() === "new" || Number.isNaN(Number(sid))) {
      // inválido — não chamar a API e retornar lista vazia
      return [];
    }
    return await safeRequestJson(`${BASE_URL}/vitimas/${encodeURIComponent(String(ocorrenciaId))}`, {}, 15000, []);
  } catch (error) {
    return [];
  }
}

/** -------------------------
 * Usuários / Perfis / Unidades
 * ------------------------- */

export async function fetchUsuarios(): Promise<Usuario[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/users`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchUsuario(id: number): Promise<Usuario | null> {
  try {
    return await safeRequestJson(`${BASE_URL}/users/id/${id}`, {}, 10000, null);
  } catch (error) {
    return null;
  }
}

export async function postUsuario(payload: any): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/users`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro na API de post usuário:", error);
    throw error;
  }
}

/**
 * Salvar push token para um usuário (rota esperada: POST /usuarios/salvar-push-token)
 * - Faz uma chamada simples que não bloqueia o fluxo de login (best-effort)
 */
export async function salvarPushToken(usuarioId: number | string, pushToken: string): Promise<any> {
  try {
    if (!pushToken) return null;
    const body = { pushToken };
    console.log('[api] salvarPushToken ->', { usuarioId, pushToken });
    const url = `${BASE_URL}/users/${encodeURIComponent(String(usuarioId))}/push-token`;
    const res = await requestJson(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, 15000);
    console.log('[api] salvarPushToken response ->', res);
    return res;
  } catch (err) {
    // não propaga erro para não quebrar o fluxo de login; loga para depuração
    console.warn('[api] falha ao salvar push token:', err);
    return null;
  }
}

export async function fetchPerfis(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/perfis`, {}, 15000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchUnidadesOperacionais(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/unidadesoperacionais`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

/** -------------------------
 * Naturezas / Grupos / Subgrupos / Viaturas
 * ------------------------- */

export async function fetchNaturezasOcorrencias(): Promise<NaturezaOcorrencia[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/naturezasocorrencias`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchGruposOcorrencias(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/gruposocorrencias`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchSubgruposOcorrencias(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/subgruposocorrencias`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchViaturas(): Promise<Viatura[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/viaturas`, {}, 20000, []);
  } catch (error) {
    return [];
  }
}

/** -------------------------
 * Regiões / IBGE / OSM
 * ------------------------- */

export async function fetchRegioes(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/regioes`, {}, 15000, []);
  } catch (error) {
    return [];
  }
}

export async function fetchMunicipiosPE(): Promise<any[]> {
  try {
    return await safeRequestJson('https://servicodados.ibge.gov.br/api/v1/localidades/estados/26/municipios', {}, 15000, []);
  } catch (error) {
    return [];
  }
}

/** -------------------------
 * Autenticação
 * ------------------------- */

// Função pública para o app inteiro usar
export const setAuthToken = (token: string | null) => {
  authToken = token;
};

// Carrega o token do AsyncStorage na inicialização do app (chame isso no root layout!)
export const initAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    authToken = token;
    return token;
  } catch (e) {
    console.error("Erro ao carregar token", e);
    return null;
  }
};

export async function loadAuthTokenFromStorage(): Promise<string | null> {
  try {
    const t = await AsyncStorage.getItem('authToken');
    authToken = t;
    return t;
  } catch {
    return null;
  }
}

/** Faz login com matrícula/senha — rota: POST /auth/login/ */
export async function login(matricula: string, senha: string): Promise<any> {
  const res = await requestJson(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    body: JSON.stringify({ matricula, senha }),
  });
  return res;
}

export async function fetchBairrosFromOSM(municipio: string): Promise<any> {
  try {
    const q = encodeURIComponent(municipio);
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];relation["boundary"="administrative"]["admin_level"="9"]["name"~"^${q}$",i](around:5000,-8.0475622,-34.8770043);out;>;out skel qt;`;
    return await requestJson(url);
  } catch (error) {
    console.error("Erro na API de bairros de OSM:", error);
    return [];
  }
}

/** -------------------------
 * Geocoding / Reverse
 * ------------------------- */

export async function fetchGeocode(query: string): Promise<any[]> {
  try {
    // If there's no network, return empty (caller should handle offline behavior)
    const NetInfo = await import('@react-native-community/netinfo');
    const net = await NetInfo.fetch();
    if (!net.isConnected) return [];

    const url = `${BASE_URL}/api/geocode?q=${encodeURIComponent(query)}`;
    try {
      return await requestJson(url);
    } catch (err) {
      // backend geocode failed — try public Nominatim as a fallback
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'ChamaApp/1.0 (+https://example.com)' } });
        if (!nomRes.ok) return [];
        const data = await nomRes.json();
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    }
  } catch (error) {
    // keep silent on unexpected errors to avoid flooding logs while offline
    return [];
  }
}

export async function fetchGeocodeCompleto(query: string): Promise<any[]> {
  try {
    const data = await fetchGeocode(query);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Erro no geocoding completo:", err);
    return [];
  }
}

export async function fetchReverseGeocode(lat: number, lon: number): Promise<any> {
  try {
    const NetInfo = await import('@react-native-community/netinfo');
    const net = await NetInfo.fetch();
    if (!net.isConnected) throw new Error('Sem conexão');

    try {
      return await requestJson(`${BASE_URL}/api/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`);
    } catch (err) {
      // fallback to Nominatim reverse
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}&format=json&addressdetails=1`;
        const nomRes = await fetch(nomUrl, { headers: { 'User-Agent': 'ChamaApp/1.0 (+https://example.com)' } });
        if (!nomRes.ok) throw new Error('Nominatim failed');
        const data = await nomRes.json();
        return data;
      } catch (e) {
        throw err;
      }
    }
  } catch (error) {
    // bubble up the error so callers can decide how to handle it
    throw error;
  }
}

/** -------------------------
 * Uploads & Anexos
 * ------------------------- */

export async function processarUploadsArquivos(arquivos: any[]): Promise<any[]> {
  const resultados: any[] = [];

  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i];
    try {
      if (arquivo.url) {
        resultados.push({ ...arquivo, url: arquivo.url, name: arquivo.name });
        // yield to allow UI updates
        await new Promise((r) => setTimeout(r, 30));
        continue;
      }

      // Prepare a React Native friendly file object:
      let fileForUpload: any = null;
      let uploadType: string | undefined = undefined;
      let uploadName: string | undefined = undefined;
      if (arquivo.data && typeof arquivo.data === 'string' && arquivo.data.startsWith('data:')) {
        fileForUpload = arquivo.data;
        uploadName = arquivo.name || `upload_${Date.now()}`;
        uploadType = arquivo.type || 'image/png';
      } else if (arquivo.uri) {
        fileForUpload = { uri: arquivo.uri, name: arquivo.name || `upload_${Date.now()}`, type: arquivo.type || 'application/octet-stream' };
        uploadName = fileForUpload.name;
        uploadType = fileForUpload.type;
      } else {
        fileForUpload = arquivo;
        uploadName = arquivo.name;
        uploadType = arquivo.type;
      }

      const url = await uploadToCloudinary(fileForUpload);
      resultados.push({ ...arquivo, url, name: uploadName, type: uploadType });
      // brief yield between uploads to keep UI responsive
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      console.error('Erro no upload de arquivo:', err);
      resultados.push({ ...arquivo, url: undefined });
      // small yield after failure as well
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  return resultados.filter(arquivo => arquivo.url);
}

export async function dataUrlParaFile(dataUrl: string, filename: string, type: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type });
}

export function prepararAnexos(arquivos: any[], assinaturaDataUrl?: string, numeroOcorrencia?: string): any[] {
  const anexos = arquivos
    .filter(arquivo => arquivo.url)
    .map(arquivo => {
      const ext = (arquivo.name || "").split(".").pop()?.toLowerCase() || "";
      const tipoArquivo = ext === "pdf" ? "arquivo" : "imagem";
      return {
        tipoArquivo,
        urlArquivo: arquivo.url,
        nomeArquivo: arquivo.name,
        extensaoArquivo: ext,
        descricao: arquivo.descricao || "",
      };
    });

  if (assinaturaDataUrl) {
    anexos.push({
      tipoArquivo: "assinatura",
      urlArquivo: assinaturaDataUrl,
      nomeArquivo: `${numeroOcorrencia || 'ocorrencia'}_assinatura.png`,
      extensaoArquivo: "png",
      descricao: "Assinatura do responsável",
    });
  }

  return anexos;
}

/** -------------------------
 * Lesões (condições da vítima)
 * ------------------------- */
export async function fetchLesoes(): Promise<any[]> {
  try {
    return await safeRequestJson(`${BASE_URL}/lesoes`, {}, 15000, []);
  } catch (error) {
    return [];
  }
}

/** -------------------------
 * Equipe da ocorrência
 * ------------------------- */
/** Buscar membros da equipe de uma ocorrência */
export async function fetchEquipeOcorrencia(ocorrenciaId: string | number): Promise<Usuario[]> {
  try {
    const sid = String(ocorrenciaId || "").trim();
    if (!sid || sid.toLowerCase() === "new" || Number.isNaN(Number(sid))) {
      return [];
    }
    // rota esperada: /ocorrencia-user/ocorrencia/:id/users
    // ajuste se sua API usar outro caminho — mantenha todo consumo aqui
    const url = `${BASE_URL}/ocorrencia-user/ocorrencia/${encodeURIComponent(String(ocorrenciaId))}/users`;
    const data = await safeRequestJson(url, {}, 10000, []);

    const arr = Array.isArray(data) ? data : [];

    // Normaliza várias formas que o backend pode devolver:
    // - já um usuário: { id, nome, patente }
    // - wrapper: { user: { ... } } ou { usuario: { ... } }
    // - campos em inglês: name, username, fullName
    const normalized = arr.map((item: any) => {
      const u = item?.user ?? item?.usuario ?? item;
      const idVal = Number(u?.id ?? item?.id ?? item?.userId ?? item?.usuarioId ?? 0) || 0;
      const nomeVal = u?.nome ?? u?.name ?? u?.username ?? u?.fullName ?? u?.nomeCompleto ?? item?.nome ?? item?.name ?? "";
      const patenteVal = u?.patente ?? u?.rank ?? item?.patente ?? item?.rank ?? undefined;

      return {
        id: idVal,
        nome: nomeVal,
        patente: patenteVal,
        ...((u && typeof u === 'object') ? u : {}),
      } as Usuario;
    });

    // remover duplicatas simples (por id ou nome)
    const mapa = new Map<string, Usuario>();
    normalized.forEach((u) => {
      const key = String(u.id || u.nome || Math.random());
      if (!mapa.has(key)) mapa.set(key, u);
    });

    return Array.from(mapa.values());
  } catch (error) {
    console.error(`Erro na API de equipe para ocorrência ${ocorrenciaId}:`, error);
    return [];
  }
}

/** -------------------------
 * Utilitários de mapeamento
 * ------------------------- */

export function mapearStatusOcorrencia(status: string): string {
  switch (status) {
    case "Pendente":
      return "pendente";
    case "Em andamento":
      return "em_andamento";
    case "Atendida":
      return "atendida";
    case "Não Atendido":
      return "nao_atendido";
    default:
      return String(status).toLowerCase().replace(/\s+/g, "_");
  }
}

export function mapearSexo(sexo?: string): string | undefined {
  if (!sexo) return undefined;
  const low = sexo.toString().toLowerCase();
  if (low.startsWith("m")) return "M";
  if (low.startsWith("f")) return "F";
  return "O";
}

/** -------------------------
 * Heatmap helper (merge ocorrências + naturezas)
 * ------------------------- */
export async function fetchDadosHeatmap(periodo?: { inicio: string; fim: string }) {
  try {
    const [ocorrencias, naturezas] = await Promise.all([
      fetchOcorrenciasComFiltro(periodo),
      fetchNaturezasOcorrencias()
    ]);

    return {
      ocorrencias: Array.isArray(ocorrencias) ? ocorrencias.map((o: any) => ({
        id: o.id,
        dataHora: o.dataHoraChamada || o.dataHora || new Date().toISOString(),
        naturezaOcorrencia: o.naturezaOcorrencia,
        localizacao: o.localizacao,
      })) : [],
      naturezas
    };
  } catch (error) {
    console.error("Erro ao buscar dados do heatmap:", error);
    return { ocorrencias: [], naturezas: [] };
  }
}

export async function postOcorrenciaUsuario(payload: { ocorrenciaId: number; userId: number }): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/ocorrencia-user`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro na API de post ocorrencia-user:", error);
    throw error;
  }
}

// Atualizar ocorrência (PUT /ocorrencias/:id)
export async function putOcorrencia(id: number, payload: any): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/ocorrencias/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`Erro na API de put ocorrência ${id}:`, error);
    throw error;
  }
}

// Deletar pessoa da equipe da ocorrencia (DELETE /ocorrencia-user/ocorrencia/:ocorrenciaId/user/:userId)

export async function deletePessoaEquipeOcorrencia(ocorrenciaId: number, userId: number): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/ocorrencia-user/ocorrencia/${encodeURIComponent(String(ocorrenciaId))}/user/${encodeURIComponent(String(userId))}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Erro na API de delete pessoa da equipe da ocorrência ${ocorrenciaId}, user ${userId}:`, error);
    throw error;
  }
}

//Atualizar vítima de uma ocorrência (PUT /vitimas/:id)

export async function putVitima(vitimaId: number, payload: any): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/vitimas/${encodeURIComponent(String(vitimaId))}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`Erro na API de put vítima ${vitimaId}:`, error);
    throw error;
  }
}

// Deletar vítima de uma ocorrência (DELETE /vitimas/:id)
export async function deleteVitima(vitimaId: number): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/vitimas/${encodeURIComponent(String(vitimaId))}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Erro na API de delete vítima ${vitimaId}:`, error);
    throw error;
  }
}

// Deletar anexo de uma ocorrência (DELETE /anexos/:id)
export async function deleteAnexo(anexoId: number): Promise<any> {
  try {
    return await requestJson(`${BASE_URL}/anexos/${encodeURIComponent(String(anexoId))}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error(`Erro na API de delete anexo ${anexoId}:`, error);
    throw error;
  }
}

