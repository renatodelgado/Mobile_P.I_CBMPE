/* eslint-disable @typescript-eslint/no-unused-vars */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { fetchGeocode, postOcorrencia, postVitima, processarUploadsArquivos, putOcorrencia } from './api';
import cacheService from './cache';

const QUEUE_KEY = '@app:offline_queue_v1';

type OfflineActionType = 'create' | 'update';

export type OfflineAction = {
  id: string;
  type: OfflineActionType;
  payload: any;
  createdAt: number;
  retries?: number;
  summary?: string;
};

let subscribers: ((q: OfflineAction[]) => void)[] = [];
let processSubscribers: ((processing: boolean) => void)[] = [];
let _processing = false;

async function readQueue(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineAction[];
  } catch (err) {
    console.warn('Erro lendo fila offline', err);
    return [];
  }
}

async function writeQueue(q: OfflineAction[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    subscribers.forEach(s => s(q));
  } catch (err) {
    console.warn('Erro gravando fila offline', err);
  }
}

export async function getQueue() {
  return await readQueue();
}

export async function getQueueLength() {
  const q = await readQueue();
  return q.length;
}

function generateId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueueAction(type: OfflineActionType, payload: any) {
  // Validate location presence for create/update when provided
  const validateLocationForEnqueue = (p: any) => {
    const loc = p?.localizacao;
    if (!loc) {
      if (type === 'create') {
        throw new Error('Localização obrigatória: municipio, logradouro, bairro e numero');
      }
      return;
    }
    const required = ['municipio', 'logradouro', 'bairro', 'numero'];
    const missing = required.filter(k => !loc[k] || String(loc[k]).trim() === '');
    if (missing.length > 0) {
      throw new Error('Localização incompleta: preencha municipio, logradouro, bairro e numero');
    }
  };

  try {
    validateLocationForEnqueue(payload);
  } catch (e) {
    throw e;
  }
  // Allow saving attachments/signature in the queue. We will upload them during processing when
  // the device is online and enrich the payload with backend-expected fields (e.g. extensaoArquivo).

  // remove latitude/longitude before saving to queue (we will geocode at send time)
  if (payload?.localizacao) {
    try { delete payload.localizacao.latitude; } catch {};
    try { delete payload.localizacao.longitude; } catch {};
  }

  const q = await readQueue();
  const item: OfflineAction = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
    // summary will be computed and attached below
  };
  try {
    // compute a human-friendly summary for display in the sync screen
    const buildSummary = async (p: any, t: OfflineActionType) => {
      try {
        const natList = (await cacheService.getNaturezasCached()) || [];
        const grpList = (await cacheService.getGruposCached()) || [];
        const subList = (await cacheService.getSubgruposCached()) || [];

        const resolveName = (list: any[], id: any) => {
          if (id === null || id === undefined) return null;
          const found = list.find((x: any) => String(x.id) === String(id) || String(x.id) === String(id?.id));
          return found ? (found.nome || found.name || String(found.id)) : null;
        };

        const loc = p?.localizacao || p || {};
        const addr = [loc.logradouro || p.logradouro, loc.numero || p.numero, loc.bairro || p.bairro, loc.municipio || p.municipio].filter(Boolean).join(', ');

        if (t === 'create') {
          if (addr) return addr;
          const nat = p?.naturezaOcorrencia?.nome || p?.natureza || resolveName(natList, p?.naturezaId || p?.natureza) || null;
          if (nat) return `Cadastro: ${nat}`;
          return 'Cadastro (offline)';
        }

        // update
        const parts: string[] = [];
        if (p?.statusAtendimento) parts.push(`Status: ${p.statusAtendimento}`);
        const nat = p?.naturezaOcorrencia?.nome || p?.natureza || resolveName(natList, p?.naturezaId || p?.natureza) || null;
        if (nat) parts.push(`Natureza: ${nat}`);
        const grp = p?.grupoOcorrencia?.nome || p?.grupo || resolveName(grpList, p?.grupoId || p?.grupo) || null;
        if (grp) parts.push(`Grupo: ${grp}`);
        const sub = p?.subgrupoOcorrencia?.nome || p?.subgrupo || resolveName(subList, p?.subgrupoId || p?.subgrupo) || null;
        if (sub) parts.push(`Subgrupo: ${sub}`);
        if (addr) parts.push(addr);
        if (parts.length === 0) return 'Edição';
        return parts.slice(0, 3).join(' • ');
      } catch (e) {
        return '';
      }
    };

    const summary = await buildSummary(payload, type);
    if (summary) (item as any).summary = summary;
  } catch (e) {
    // ignore summary computation failures
  }
  // If this is a create action, add a temporary negative numeric id to the payload
  // and write a lightweight cached occurrence so the UI can display/open it while offline.
  if (type === 'create') {
    try {
      const userId = payload?.usuarioId || (payload.usuario && payload.usuario.id) || null;
      const tempId = -Date.now();
      // attach a local id so screens that call Number(id) still receive a numeric value
      try { payload.id = tempId; } catch {}

      const cachedObj: any = {
        id: tempId,
        numeroOcorrencia: payload.numeroOcorrencia || `OCR_LOCAL_${Math.abs(tempId)}`,
        dataHoraChamada: payload.dataHoraChamada || new Date().toISOString(),
        statusAtendimento: payload.statusAtendimento || 'pendente',
        descricao: payload.descricao || null,
        localizacao: payload.localizacao || null,
        usuario: userId ? { id: userId } : (payload.usuario || null),
        anexos: (payload.anexos || []).map((a: any) => ({ urlArquivo: a.url || a.uri || null, nomeArquivo: a.name || a.nome || null, tipoArquivo: a.type || a.tipoArquivo || 'imagem' })),
      };

      // write to per-user cache
      if (userId) {
        try {
          const key = `@app:cache:ocorrencias_usuario_v1_${userId}`;
          const raw = await AsyncStorage.getItem(key);
          const arr = raw ? (JSON.parse(raw).data || []) : [];
          const exists = arr.find((o: any) => String(o.id) === String(cachedObj.id) || String(o.numeroOcorrencia) === String(cachedObj.numeroOcorrencia));
          if (!exists) {
            arr.unshift(cachedObj);
            await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data: arr }));
          }
        } catch (e) {
          // ignore cache write errors
        }
      }

      // also write to generic occurrences cache
      try {
        const keyGen = '@app:cache:ocorrencias_v1';
        const rawGen = await AsyncStorage.getItem(keyGen);
        const arrGen = rawGen ? (JSON.parse(rawGen).data || []) : [];
        const existsGen = arrGen.find((o: any) => String(o.id) === String(cachedObj.id) || String(o.numeroOcorrencia) === String(cachedObj.numeroOcorrencia));
        if (!existsGen) {
          arrGen.unshift(cachedObj);
          await AsyncStorage.setItem(keyGen, JSON.stringify({ updatedAt: Date.now(), data: arrGen }));
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // non-fatal
    }
  }
  q.push(item);
  await writeQueue(q);
  // trigger a background attempt
  processQueue().catch(() => {});
  return item.id;
}

export async function removeAction(id: string) {
  const q = await readQueue();
  const filtered = q.filter(x => x.id !== id);
  await writeQueue(filtered);
}

export async function updateAction(id: string, newPayload: any) {
  const q = await readQueue();
  const idx = q.findIndex(x => x.id === id);
  if (idx === -1) return false;
  q[idx].payload = newPayload;
  try {
    // recompute summary for UI
    const buildSummary = async (p: any) => {
      try {
        const natList = (await cacheService.getNaturezasCached()) || [];
        const grpList = (await cacheService.getGruposCached()) || [];
        const subList = (await cacheService.getSubgruposCached()) || [];
        const resolveName = (list: any[], id: any) => {
          if (id === null || id === undefined) return null;
          const found = list.find((x: any) => String(x.id) === String(id) || String(x.id) === String(id?.id));
          return found ? (found.nome || found.name || String(found.id)) : null;
        };
        const loc = p?.localizacao || p || {};
        const addr = [loc.logradouro || p.logradouro, loc.numero || p.numero, loc.bairro || p.bairro, loc.municipio || p.municipio].filter(Boolean).join(', ');
        const parts: string[] = [];
        if (p?.statusAtendimento) parts.push(`Status: ${p.statusAtendimento}`);
        const nat = p?.naturezaOcorrencia?.nome || p?.natureza || resolveName(natList, p?.naturezaId || p?.natureza) || null;
        if (nat) parts.push(`Natureza: ${nat}`);
        const grp = p?.grupoOcorrencia?.nome || p?.grupo || resolveName(grpList, p?.grupoId || p?.grupo) || null;
        if (grp) parts.push(`Grupo: ${grp}`);
        const sub = p?.subgrupoOcorrencia?.nome || p?.subgrupo || resolveName(subList, p?.subgrupoId || p?.subgrupo) || null;
        if (sub) parts.push(`Subgrupo: ${sub}`);
        if (addr) parts.push(addr);
        if (parts.length === 0) return 'Edição';
        return parts.slice(0, 3).join(' • ');
      } catch (e) {
        return 'Edição';
      }
    };
    const s = await buildSummary(newPayload);
    q[idx].summary = s;
  } catch (e) {
    // ignore
  }
  q[idx].retries = 0;
  await writeQueue(q);
  return true;
}

export function subscribe(cb: (q: OfflineAction[]) => void) {
  subscribers.push(cb);
  // immediately call with current queue
  readQueue().then(q => cb(q)).catch(() => {});
  return () => {
    subscribers = subscribers.filter(s => s !== cb);
  };
}

export function subscribeProcessing(cb: (processing: boolean) => void) {
  processSubscribers.push(cb);
  try {
    cb(_processing);
  } catch {}
  return () => {
    processSubscribers = processSubscribers.filter(x => x !== cb);
  };
}

async function attemptSend(action: OfflineAction) {
  if (!action) return false;
  try {
    // if there's no network, bail out early to avoid noisy errors
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return false;
    } catch {
      // if NetInfo fails, continue and let requests fail gracefully
    }
    // yield to the event loop briefly before starting heavy work (blob conversions/uploads)
    await new Promise((res) => setTimeout(res, 50));
    // Normalize location fields to avoid sending nulls (backend may reject null municipio, etc.)
    const ensureLocalizacao = (payload: any) => {
      if (!payload) return;
      const mustBeObject = payload.localizacao && typeof payload.localizacao === 'object';
      if (!mustBeObject) {
        payload.localizacao = {
          municipio: '',
          bairro: '',
          logradouro: '',
          numero: '',
          pontoReferencia: '',
          latitude: null,
          longitude: null,
        };
        return;
      }

      // textual fields: avoid sending null (some backends reject null municipio)
      const textKeys = ['municipio', 'bairro', 'logradouro', 'numero', 'pontoReferencia'];
      textKeys.forEach(k => {
        if (payload.localizacao[k] === null || payload.localizacao[k] === undefined) payload.localizacao[k] = '';
      });

      // numeric fields: if empty/invalid, remove the property so backend doesn't receive NULL
      const numKeys = ['latitude', 'longitude'];
      numKeys.forEach(k => {
        const v = payload.localizacao[k];
        if (v === null || v === undefined || v === '') {
          // delete key to avoid sending explicit null which some DB columns disallow
          try { delete payload.localizacao[k]; } catch (e) { payload.localizacao[k] = undefined; }
        } else if (typeof v === 'string') {
          const nv = v.trim();
          if (nv === '' || Number.isNaN(Number(nv))) {
            try { delete payload.localizacao[k]; } catch (e) { payload.localizacao[k] = undefined; }
          } else {
            // keep numeric string as-is
            payload.localizacao[k] = nv;
          }
        }
      });
    };

    // apply normalization to main payload and nested occurrence object if present
    ensureLocalizacao(action.payload);
    if (action.payload?.ocorrencia) ensureLocalizacao(action.payload.ocorrencia);
    // If we don't have latitude/longitude, try to geocode the address now
    const tryGeocode = async (p: any) => {
      const loc = p?.localizacao;
      if (!loc) return;
      // if both present, skip
      if ((loc.latitude || loc.latitude === 0) && (loc.longitude || loc.longitude === 0)) return;

      // require minimal address to geocode
      const required = ['municipio', 'logradouro', 'bairro', 'numero'];
      const ok = required.every(k => loc[k] && String(loc[k]).trim() !== '');
      if (!ok) return; // cannot geocode

      try {
        // Append state/country to improve geocoding accuracy from mobile devices
        const query = `${loc.logradouro}, ${loc.numero}, ${loc.bairro}, ${loc.municipio}, Pernambuco, Brazil`;
        const results = await fetchGeocode(query).catch(() => []);
        if (Array.isArray(results) && results[0]) {
          const g = results[0];
          const lat = g.lat ?? g.latitude ?? g.latitud ?? g.y ?? null;
          const lon = g.lon ?? g.longitude ?? g.longitud ?? g.x ?? null;
          if (lat != null && lon != null) {
            p.localizacao = p.localizacao || {};
            p.localizacao.latitude = String(lat);
            p.localizacao.longitude = String(lon);
          }
        }
      } catch (e) {
        // geocoding failed — proceed without coords
      }
    };

    // give the UI a chance to render before heavy work
    await new Promise((r) => setTimeout(r, 40));
    await tryGeocode(action.payload);
    if (action.payload?.ocorrencia) await tryGeocode(action.payload.ocorrencia);
    // If there are local anexos (uri) try to upload them first
    if (action.payload?.anexos && Array.isArray(action.payload.anexos)) {
      const arquivos = action.payload.anexos.map((a: any) => ({
        uri: a.uri || a.urlArquivo || a.url,
        name: a.name || a.nomeArquivo || `anexo_${Date.now()}`,
        type: a.type || (a.tipoArquivo === 'video' ? 'video/mp4' : 'image/jpeg')
      }));
      const hadLocalFiles = arquivos.some((ar: any) => {
        const u = ar.uri || '';
        // consider as local if it's a file://, content://, or data: URI, or a path without http(s)
        return typeof u === 'string' && (u.startsWith('file:') || u.startsWith('content:') || u.startsWith('data:') || (!u.startsWith('http') && !u.startsWith('https') && u.indexOf('/') >= 0));
      });
      // yield before starting uploads and process sequentially inside API helper
      await new Promise((r) => setTimeout(r, 50));
      const uploaded = await processarUploadsArquivos(arquivos).catch(() => []);
      // small yield after uploads so UI can update
      await new Promise((r) => setTimeout(r, 40));
      if (uploaded && uploaded.length > 0) {
        action.payload.anexos = uploaded.map((u: any) => {
          const name = u.name || u.filename || 'anexo';
          let ext = (name && name.includes('.')) ? name.split('.').pop() : (u.url && u.url.includes('.') ? u.url.split('.').pop() : null);
          if (!ext && u.type) {
            const mimeToExt: Record<string, string> = {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/jpg': 'jpg',
              'video/mp4': 'mp4',
              'application/pdf': 'pdf',
            };
            ext = mimeToExt[u.type] || null;
          }
          if (!ext) ext = 'bin';
          return {
            urlArquivo: u.url,
            nomeArquivo: name,
            tipoArquivo: u.type || (u.url?.includes('.pdf') ? 'arquivo' : 'imagem'),
            extensaoArquivo: ext,
          };
        });
      } else {
        // if upload failed and we had local files that needed uploading, abort this attempt
        if (hadLocalFiles) {
          return false;
        }
        // otherwise continue and let backend handle missing anexos later
      }
    }

    // If there's a signature saved as a data URL, upload it and include as an anexo
    if (action.payload?.assinaturaDataUrl) {
      try {
        const dataUrl = action.payload.assinaturaDataUrl;
        // use processarUploadsArquivos via dynamic import to avoid circular deps
        const api = await import('./api');
        const arquivos = [{ data: dataUrl, name: `${action.payload.numeroOcorrencia || 'assinatura'}_assinatura.png`, type: 'image/png' }];
        // yield before signature upload
        await new Promise((r) => setTimeout(r, 40));
        const uploadedSig = await api.processarUploadsArquivos(arquivos).catch(() => []);
        if (uploadedSig && uploadedSig.length > 0) {
          const u = uploadedSig[0];
          const name = u.name || u.filename || `${action.payload.numeroOcorrencia || 'assinatura'}_assinatura.png`;
          const ext = (name && name.includes('.')) ? name.split('.').pop() : (u.url && u.url.includes('.') ? u.url.split('.').pop() : 'png');
          action.payload.anexos = action.payload.anexos || [];
          action.payload.anexos.push({
            urlArquivo: u.url,
            nomeArquivo: name,
            tipoArquivo: 'assinatura',
            extensaoArquivo: ext,
            descricao: 'Assinatura do responsável',
          });
        }
      } catch (e) {
        // ignore signature upload failures; backend may accept without signature
        // but if we had a signature dataUrl we should not attempt the server request without uploading it
        return false;
      } finally {
        // remove the data url so we don't try again later unnecessarily
        try { delete action.payload.assinaturaDataUrl; } catch {};
      }
    }

    if (action.type === 'create') {
      // Ensure we have coordinates before attempting to create on the server
      const loc = action.payload?.localizacao;
      if (!(loc && (loc.latitude || loc.latitude === 0) && (loc.longitude || loc.longitude === 0))) {
        // missing coords — do not attempt to send, retry later after network/geocode availability
        return false;
      }

      const resp = await postOcorrencia(action.payload);
      const ocorrenciaId = resp?.id || resp?.ocorrenciaId;
      // update local caches: remove temp placeholder (if present) and replace with server response
      try {
        const userId = action.payload?.usuarioId || (action.payload.usuario && action.payload.usuario.id) || null;
        const tempId = action.payload?.id; // our temp negative id

        const serverObj = (resp && typeof resp === 'object') ? resp : { id: ocorrenciaId, ...action.payload };

        // update per-user cache
        if (userId) {
          try {
            const key = `@app:cache:ocorrencias_usuario_v1_${userId}`;
            const raw = await AsyncStorage.getItem(key);
            const arr = raw ? (JSON.parse(raw).data || []) : [];
            const replaced = arr.map((o: any) => {
              if (String(o.id) === String(tempId) || String(o.numeroOcorrencia) === String(action.payload?.numeroOcorrencia)) {
                return serverObj;
              }
              return o;
            });
            // if not present, consider prepending the server object
            const exists = replaced.find((o: any) => String(o.id) === String(serverObj.id));
            const finalArr = exists ? replaced : [serverObj, ...replaced];
            await AsyncStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), data: finalArr }));
          } catch (e) {}
        }

        // update generic cache
        try {
          const keyGen = '@app:cache:ocorrencias_v1';
          const rawGen = await AsyncStorage.getItem(keyGen);
          const arrGen = rawGen ? (JSON.parse(rawGen).data || []) : [];
          const replacedGen = arrGen.map((o: any) => {
            if (String(o.id) === String(tempId) || String(o.numeroOcorrencia) === String(action.payload?.numeroOcorrencia)) {
              return serverObj;
            }
            return o;
          });
          const existsGen = replacedGen.find((o: any) => String(o.id) === String(serverObj.id));
          const finalGen = existsGen ? replacedGen : [serverObj, ...replacedGen];
          await AsyncStorage.setItem(keyGen, JSON.stringify({ updatedAt: Date.now(), data: finalGen }));
        } catch (e) {}

        // update queued update actions that referenced the tempId to reference the real server id
        try {
          const currentQueue = await readQueue();
          let changed = false;
          for (const act of currentQueue) {
            if (act.type === 'update') {
              const p = act.payload;
              if (p) {
                const pid = p.id ?? p.ocorrenciaId ?? p.ocorrencia?.id;
                if (String(pid) === String(tempId)) {
                  try {
                    if (p.id !== undefined) p.id = ocorrenciaId;
                    if (p.ocorrenciaId !== undefined) p.ocorrenciaId = ocorrenciaId;
                    if (p.ocorrencia && p.ocorrencia.id !== undefined) p.ocorrencia.id = ocorrenciaId;
                    changed = true;
                  } catch (e) {}
                }
              }
            }
          }
          if (changed) await writeQueue(currentQueue);
        } catch (e) {}
      } catch (e) {
        // cache update non-fatal
      }
      // if there are vítimas, post them
      if (ocorrenciaId && Array.isArray(action.payload.vitimas)) {
        await Promise.all((action.payload.vitimas || []).map((v: any) => postVitima({ ...v, ocorrenciaId }).catch(() => {})));
      }
      return true;
    }

    if (action.type === 'update') {
      const id = Number(action.payload.id || action.payload.ocorrenciaId || action.payload.ocorrencia?.id);
      if (!id) throw new Error('Missing id for update');
      // backend expects PUT /ocorrencias/:id payload
      await putOcorrencia(id, action.payload);
      // víctims (if provided) should be handled by payload.vitimas on server side; if client provided, optionally post them separately
      if (Array.isArray(action.payload.vitimas)) {
        // try to post any victims without numeric id
        await Promise.all(action.payload.vitimas.map((v: any) => {
          if (!v.id) return postVitima({ ...v, ocorrenciaId: id }).catch(() => {});
          return Promise.resolve(null);
        }));
      }
      return true;
    }

    return false;
  } catch (err) {
    // network error or server error — we'll retry later
    try {
      const errMessage = err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err);
      console.error('[offline] Falha ao enviar ação offline', { id: action?.id, type: action?.type, error: errMessage });
    } catch (e) {
      console.warn('Erro ao logar falha offline', e);
    }
    return false;
  }
}

export async function processQueue() {
  if (_processing) return;
  _processing = true;
  try {
    // notify subscribers that processing started
    processSubscribers.forEach(s => { try { s(true); } catch {} });
    // If offline, skip processing entirely
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;
    } catch {
      // If NetInfo fails, proceed to attempt processing (best-effort)
    }

    const q = await readQueue();
    if (!q || q.length === 0) return;

    // process sequentially; on first network failure stop and retry later
    for (const item of q) {
      const ok = await attemptSend(item);
      if (ok) {
        await removeAction(item.id);
      } else {
        // increase retry count
        const current = await readQueue();
        const found = current.find(x => x.id === item.id);
        if (found) {
          found.retries = (found.retries || 0) + 1;
          await writeQueue(current);
        }
        // stop processing on first failure to avoid burning battery
        break;
      }
    }
  } finally {
    _processing = false;
    // notify subscribers that processing ended
    processSubscribers.forEach(s => { try { s(false); } catch {} });
  }
}

export async function sendItem(id: string) {
  // mark processing for single-item sends so UI can show overlay
  if (_processing) {
    // already processing elsewhere
  }
  _processing = true;
  processSubscribers.forEach(s => { try { s(true); } catch {} });
  const q = await readQueue();
  const item = q.find(x => x.id === id);
  if (!item) throw new Error('Item não encontrado');
  const ok = await attemptSend(item);
  if (ok) {
    await removeAction(id);
    _processing = false;
    processSubscribers.forEach(s => { try { s(false); } catch {} });
    return true;
  }

  // If attemptSend returned false, try to provide a clearer reason
  // Common case: missing latitude/longitude that prevents create requests
  const loc = item.payload?.localizacao || item.payload?.ocorrencia?.localizacao;
  const hasCoords = loc && (loc.latitude || loc.longitude || loc.lat || loc.lon);
  if (!hasCoords) {
    // increment retry counter so UI shows updated state
    const current = await readQueue();
    const found = current.find(x => x.id === id);
    if (found) {
      found.retries = (found.retries || 0) + 1;
      await writeQueue(current);
    }
    // throw a specific error the UI can detect and show instructions
    const e: any = new Error('Missing coordinates');
    e.code = 'MISSING_COORDS';
    throw e;
  }

  // Otherwise, increment retry and return false (transient failure)
  const current = await readQueue();
  const found = current.find(x => x.id === id);
  if (found) {
    found.retries = (found.retries || 0) + 1;
    await writeQueue(current);
  }
  _processing = false;
  processSubscribers.forEach(s => { try { s(false); } catch {} });
  return false;
}

export default {
  enqueueAction,
  getQueue,
  getQueueLength,
  removeAction,
  updateAction,
  sendItem,
  processQueue,
  subscribe,
};
