import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
    fetchGruposOcorrencias,
    fetchLesoes,
    fetchNaturezasOcorrencias,
    fetchOcorrenciasUsuario,
    fetchSubgruposOcorrencias,
    fetchUnidadesOperacionais,
    fetchUsuarios,
    fetchViaturas,
} from './api';

const PREFIX = '@app:cache:';

const KEYS = {
  usuarios: PREFIX + 'usuarios_v1',
  viaturas: PREFIX + 'viaturas_v1',
  subgrupos: PREFIX + 'subgrupos_v1',
  grupos: PREFIX + 'grupos_v1',
  naturezas: PREFIX + 'naturezas_v1',
  unidades: PREFIX + 'unidades_v1',
  lesoes: PREFIX + 'lesoes_v1',
  ocorrenciasUsuario: (userId: number) => PREFIX + `ocorrencias_usuario_v1_${userId}`,
};

async function setCached(key: string, data: any) {
  try {
    const payload = { updatedAt: Date.now(), data };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[cache] falha ao gravar cache', key, err);
  }
}

async function getCachedRaw(key: string): Promise<{ updatedAt?: number; data?: any } | null> {
  try {
    const s = await AsyncStorage.getItem(key);
    if (!s) return null;
    return JSON.parse(s);
  } catch (err) {
    console.warn('[cache] falha ao ler cache', key, err);
    return null;
  }
}

async function getCached(key: string): Promise<any | null> {
  const raw = await getCachedRaw(key);
  return raw ? raw.data : null;
}

async function fetchAndCache(key: string, fetcher: () => Promise<any>) {
  try {
    const data = await fetcher();
    if (data === null || data === undefined) return { changed: false, data: null };

    const prevRaw = await getCachedRaw(key);
    const prev = prevRaw ? prevRaw.data : null;

    // If the fetcher returned an empty array, treat it as a possible transient failure
    // and avoid overwriting an existing cache with an empty list. This prevents
    // wiping local cached data when backend temporarily returns 0 items due to error.
    if (Array.isArray(data) && data.length === 0 && prev != null) {
      // do not overwrite existing cache with an empty array
      console.log(`[cache] resposta vazia para ${key}, mantendo cache existente`);
      return { changed: false, data: prev };
    }

    const equal = JSON.stringify(prev) === JSON.stringify(data);
    if (!equal) {
      await setCached(key, data);
      console.log(`[cache] atualizado: ${key}`);
      return { changed: true, data };
    }
    return { changed: false, data };
  } catch (err) {
    console.warn('[cache] erro ao buscar e gravar', key, err);
    return { changed: false, data: null };
  }
}

/** Public API */
export async function initCache(userId?: number) {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      console.log('[cache] sem conexão — pulando inicialização');
      return;
    }

    // Dispara buscas em paralelo, cada item grava somente se diferente
    await Promise.all([
      fetchAndCache(KEYS.usuarios, fetchUsuarios),
      fetchAndCache(KEYS.viaturas, fetchViaturas),
      fetchAndCache(KEYS.subgrupos, fetchSubgruposOcorrencias),
      fetchAndCache(KEYS.grupos, fetchGruposOcorrencias),
      fetchAndCache(KEYS.naturezas, fetchNaturezasOcorrencias),
      fetchAndCache(KEYS.unidades, fetchUnidadesOperacionais),
      fetchAndCache(KEYS.lesoes, fetchLesoes),
      // ocorrências do usuário (se fornecido)
      ...(userId ? [fetchAndCache(KEYS.ocorrenciasUsuario(userId), () => fetchOcorrenciasUsuario(userId))] : []),
    ]);

    console.log('[cache] inicialização concluída');
  } catch (err) {
    console.warn('[cache] falha na inicialização', err);
  }
}

export async function syncIfOnline(userId?: number) {
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    // non-blocking: don't await too long for each — run in background
    initCache(userId).catch(e => console.warn('[cache] syncIfOnline error', e));
  } catch (err) {
    console.warn('[cache] syncIfOnline falha', err);
  }
}

// Getters
export const getUsuariosCached = () => getCached(KEYS.usuarios);
export const getViaturasCached = () => getCached(KEYS.viaturas);
export const getSubgruposCached = () => getCached(KEYS.subgrupos);
export const getGruposCached = () => getCached(KEYS.grupos);
export const getNaturezasCached = () => getCached(KEYS.naturezas);
export const getUnidadesCached = () => getCached(KEYS.unidades);
export const getLesoesCached = () => getCached(KEYS.lesoes);
export const getOcorrenciasUsuarioCached = (userId: number) => getCached(KEYS.ocorrenciasUsuario(userId));

export default {
  initCache,
  syncIfOnline,
  getUsuariosCached,
  getViaturasCached,
  getSubgruposCached,
  getGruposCached,
  getNaturezasCached,
  getUnidadesCached,
  getLesoesCached,
  getOcorrenciasUsuarioCached,
};
