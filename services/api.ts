// api.ts (refatorado)

import { uploadToCloudinary } from "../utils/uploadToCloudinary";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from "react-native";

const IP_DA_SUA_MAQUINA = "172.26.47.142";

const BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? `http://10.0.2.2:3333`           // emulador Android
    : `http://${IP_DA_SUA_MAQUINA}:3000` // iOS simulator, iPhone físico, Android físico
  : "https://suaapi.com"; // produção

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

/** -------------------------
 * Ocorrências
 * ------------------------- */

/** Buscar todas as ocorrências (sem filtros complexos) */
export async function fetchOcorrencias(): Promise<OcorrenciaAPI[]> {
  try {
    return await requestJson(`${BASE_URL}/ocorrencias`);
  } catch (error) {
    console.error("Erro na API de ocorrências:", error);
    return [];
  }
}

/** Buscar ocorrência por ID (rota: GET /ocorrencias/:id) */
export async function getOcorrenciaPorId(id: string | number): Promise<OcorrenciaAPI | null> {
  try {
    // Guard: avoid requesting invalid ids (e.g. route params like "new")
    const sid = String(id || "").trim();
    if (!sid || sid.toLowerCase() === "new" || Number.isNaN(Number(sid))) {
      return null;
    }
    const raw = await requestJson(`${BASE_URL}/ocorrencias/${encodeURIComponent(String(id))}`);
    return raw as OcorrenciaAPI;
  } catch (error) {
    console.error(`Erro ao buscar ocorrência ${id}:`, error);
    return null;
  }
}

/** Buscar ocorrências do usuário (rota existente) */
export async function fetchOcorrenciasUsuario(usuarioId: number): Promise<OcorrenciaAPI[]> {
  try {
    // 1. Ocorrências criadas pelo usuário
    const created = await requestJson(`${BASE_URL}/ocorrencias/usuario/${usuarioId}`).catch(() => []);
    try {
      console.log(`[api] fetchOcorrenciasUsuario: fetched /ocorrencias/usuario/${usuarioId} -> ${Array.isArray(created) ? created.length : 'na'}`);
    } catch {}

    // 1b. fallback: alguns backends não expõem /ocorrencias/usuario/:id —
    // buscar todas e filtrar por campo usuarioId / usuario?.id
    const allFallback = await requestJson(`${BASE_URL}/ocorrencias`).catch(() => []);
    const createdFromAll = Array.isArray(allFallback)
      ? allFallback.filter((o: any) => (o.usuario && (o.usuario.id === usuarioId || Number(o.usuario.id) === usuarioId)) || Number(o.usuarioId) === usuarioId)
      : [];
    try {
      console.log(`[api] fetchOcorrenciasUsuario: fetched /ocorrencias -> ${Array.isArray(allFallback) ? allFallback.length : 'na'}, createdFromAll -> ${createdFromAll.length}`);
    } catch {}

    // 2. Ocorrências em que ele é membro da equipe (apenas IDs + dados básicos)
    const memberRaw = await requestJson(`${BASE_URL}/ocorrencia-user/user/${usuarioId}/ocorrencias`).catch(() => []);
    try {
      // log a small sample to inspect structure (1-3 items)
      const sample = Array.isArray(memberRaw) ? memberRaw.slice(0, 3) : memberRaw;
      console.log('[api] fetchOcorrenciasUsuario: memberRaw sample ->', JSON.stringify(sample));
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
      console.log(`[api] fetchOcorrenciasUsuario: fetched memberRaw -> ${Array.isArray(memberRaw) ? memberRaw.length : 'na'}, memberIds -> ${JSON.stringify(memberIds)}`);
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
      console.log(`[api] fetchOcorrenciasUsuario: deduped -> ${mapa.size} ids: ${JSON.stringify(Array.from(mapa.keys()))}`);
    } catch {}

    return Array.from(mapa.values());
  } catch (error) {
    console.error("Erro crítico ao carregar ocorrências do usuário:", error);
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
    return await requestJson(url);
  } catch (error) {
    console.error("Erro na API de ocorrências com filtro:", error);
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
    return await requestJson(url);
  } catch (error) {
    console.error("Erro na API de ocorrências por natureza:", error);
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
    console.error("Erro na API de post ocorrência:", error);
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
    console.error("Erro na API de post ocorrência com timeout:", error);
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
    return await requestJson(`${BASE_URL}/vitimas/${encodeURIComponent(String(ocorrenciaId))}`);
  } catch (error) {
    console.error(`Erro na API de vítimas para ocorrência ${ocorrenciaId}:`, error);
    return [];
  }
}

/** -------------------------
 * Usuários / Perfis / Unidades
 * ------------------------- */

export async function fetchUsuarios(): Promise<Usuario[]> {
  try {
    return await requestJson(`${BASE_URL}/users`);
  } catch (error) {
    console.error("Erro na API de usuários:", error);
    return [];
  }
}

export async function fetchUsuario(id: number): Promise<Usuario | null> {
  try {
    return await requestJson(`${BASE_URL}/users/id/${id}`);
  } catch (error) {
    console.error("Erro na API de usuário:", error);
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

export async function fetchPerfis(): Promise<any[]> {
  try {
    return await requestJson(`${BASE_URL}/perfis`);
  } catch (error) {
    console.error("Erro na API de perfis:", error);
    return [];
  }
}

export async function fetchUnidadesOperacionais(): Promise<any[]> {
  try {
    return await requestJson(`${BASE_URL}/unidadesoperacionais`);
  } catch (error) {
    console.error("Erro na API de unidades operacionais:", error);
    return [];
  }
}

/** -------------------------
 * Naturezas / Grupos / Subgrupos / Viaturas
 * ------------------------- */

export async function fetchNaturezasOcorrencias(): Promise<NaturezaOcorrencia[]> {
  try {
    return await requestJson(`${BASE_URL}/naturezasocorrencias`);
  } catch (error) {
    console.error("Erro na API de naturezas:", error);
    return [];
  }
}

export async function fetchGruposOcorrencias(): Promise<any[]> {
  try {
    return await requestJson(`${BASE_URL}/gruposocorrencias`);
  } catch (error) {
    console.error("Erro na API de grupos de ocorrências:", error);
    return [];
  }
}

export async function fetchSubgruposOcorrencias(): Promise<any[]> {
  try {
    return await requestJson(`${BASE_URL}/subgruposocorrencias`);
  } catch (error) {
    console.error("Erro na API de subgrupos de ocorrências:", error);
    return [];
  }
}

export async function fetchViaturas(): Promise<Viatura[]> {
  try {
    return await requestJson(`${BASE_URL}/viaturas`);
  } catch (error) {
    console.error("Erro na API de viaturas:", error);
    return [];
  }
}

/** -------------------------
 * Regiões / IBGE / OSM
 * ------------------------- */

export async function fetchRegioes(): Promise<any[]> {
  try {
    return await requestJson(`${BASE_URL}/regioes`);
  } catch (error) {
    console.error("Erro na API de regiões:", error);
    return [];
  }
}

export async function fetchMunicipiosPE(): Promise<any[]> {
  try {
    return await requestJson('https://servicodados.ibge.gov.br/api/v1/localidades/estados/26/municipios');
  } catch (error) {
    console.error("Erro na API de municípios de PE:", error);
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
    const url = `${BASE_URL}/api/geocode?q=${encodeURIComponent(query)}`;
    return await requestJson(url);
  } catch (error) {
    console.error("Erro no geocoding:", error);
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
    return await requestJson(`${BASE_URL}/api/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`);
  } catch (error) {
    console.error("Erro na API de reverse geocoding:", error);
    throw error;
  }
}

/** -------------------------
 * Uploads & Anexos
 * ------------------------- */

export async function processarUploadsArquivos(arquivos: any[]): Promise<any[]> {
  const resultados = await Promise.all(
    arquivos.map(async (arquivo) => {
      try {
        if (arquivo.url) return { ...arquivo, url: arquivo.url };

        // Se for data URL, converter para Blob/File
        let file: File;
        if (arquivo.data && typeof arquivo.data === "string" && arquivo.data.startsWith("data:")) {
          const response = await fetch(arquivo.data);
          const blob = await response.blob();
          file = new File([blob], arquivo.name || `upload_${Date.now()}`, { type: arquivo.type || "application/octet-stream" });
        } else {
          file = arquivo;
        }

        const url = await uploadToCloudinary(file);
        return { ...arquivo, url };
      } catch (err) {
        console.error("Erro no upload de arquivo:", err);
        return { ...arquivo, url: undefined };
      }
    })
  );

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
    return await requestJson(`${BASE_URL}/lesoes`);
  } catch (error) {
    console.error("Erro na API de lesões:", error);
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
    const data = await requestJson(url);

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
    case "Concluída":
      return "concluida";
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

