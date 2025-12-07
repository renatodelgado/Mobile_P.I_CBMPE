// app/sincronizacao.tsx — VERSÃO FINAL (com número da ocorrência)

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import {
    CheckCircle,
    PencilSimple,
    Plus,
    Trash,
    UploadSimple,
    WarningCircle,
    XCircle,
} from 'phosphor-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import offlineService from '../services/offline';
import {
    Container,
    EmptyText,
    Greeting,
    Header,
    OcorrenciaCard,
    OcorrenciaFooter,
    OcorrenciaHeader,
    OcorrenciaId,
    Subtitle,
} from '../styles/styles';

export default function Sincronizacao() {
  const router = useRouter();
  const [queue, setQueue] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(true);

  const resolveNumeroParaItem = async (item: any) => {
    const possible = (
      item.payload?.numeroOcorrencia ||
      item.payload?.ocorrencia?.numeroOcorrencia ||
      item.payload?.numero_ocorrencia ||
      null
    );
    if (possible) return possible;

    // try to resolve via id from generic occurrences cache
    const id = item.payload?.id || item.payload?.ocorrencia?.id || item.payload?.ocorrenciaId || null;
    if (!id) return null;

    try {
      const raw = await AsyncStorage.getItem('@app:cache:ocorrencias_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const arr = parsed?.data || [];
      const found = arr.find((o: any) => String(o.id) === String(id) || String(o.numeroOcorrencia) === String(id));
      if (found) return found.numeroOcorrencia || (found.id ? String(found.id) : null);
    } catch (e) {
      // ignore
    }
    return null;
  };

  const loadQueue = async () => {
    setRefreshing(true);
    try {
      const q = (await offlineService.getQueue()) || [];
      // enrich items with displayNumero to avoid async work inside render
      const enriched = await Promise.all(q.map(async (it: any) => {
        try {
          const num = await resolveNumeroParaItem(it);
          return { ...it, displayNumero: num };
        } catch {
          return it;
        }
      }));
      setQueue(enriched);
    } catch {
      setQueue([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const unsub = offlineService.subscribe?.((q: any[]) => {
      if (!mounted) return;
      (async () => {
        try {
          const enriched = await Promise.all((q || []).map(async (it: any) => {
            try {
              const num = await resolveNumeroParaItem(it);
              return { ...it, displayNumero: num };
            } catch {
              return it;
            }
          }));
          setQueue(enriched);
        } catch {
          setQueue(q || []);
        }
      })();
    });

    loadQueue();

    const netSub = NetInfo.addEventListener(state => {
      setIsConnected(Boolean(state.isConnected));
    });
    NetInfo.fetch().then(s => setIsConnected(Boolean(s.isConnected)));

    return () => {
      mounted = false;
      unsub?.();
      netSub();
    };
  }, []);

  const hasCoords = (item: any) => {
    const loc = item.payload?.localizacao || item.payload?.ocorrencia?.localizacao || {};
    return loc.latitude && loc.longitude;
  };

  const getNumeroOcorrencia = (item: any) => {
    return (
      item.payload?.numeroOcorrencia ||
      item.payload?.ocorrencia?.numeroOcorrencia ||
      item.payload?.numero_ocorrencia ||
      null
    );
  };

  const openEdit = (item: any) => {
    const occId = item.payload?.id || item.payload?.ocorrencia?.id || 'new';
    router.push(`/ocorrencia/${occId}?queueItem=${encodeURIComponent(item.id)}`);
  };

  const sendNow = async (item: any) => {
    if (!isConnected) {
      Alert.alert('Sem internet', 'Conecte-se para enviar.');
      return;
    }
    setSendingIds(prev => new Set(prev).add(item.id));
    try {
      await offlineService.sendItem(item.id);
      Alert.alert('Enviado', 'Sincronizado com sucesso!');
    } catch (err: any) {
      if (err.code === 'MISSING_COORDS') {
        Alert.alert('Faltam coordenadas', 'Edite o item para adicionar o endereço completo.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Editar', onPress: () => openEdit(item) },
        ]);
      } else {
        Alert.alert('Erro', err.message || 'Falha ao enviar');
      }
    } finally {
      setSendingIds(prev => {
        const n = new Set(prev);
        n.delete(item.id);
        return n;
      });
      loadQueue();
    }
  };

  const removeItem = (id: string) => {
    Alert.alert('Remover?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await offlineService.removeAction(id);
          loadQueue();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isCreate = item.type === 'create';
    const numero = item.displayNumero || getNumeroOcorrencia(item);

    return (
      <OcorrenciaCard style={{ marginBottom: 12 }}>
        <OcorrenciaHeader>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isCreate ? (
                <Plus size={24} color="#dc2626" weight="bold" />
              ) : (
                <PencilSimple size={24} color="#4338ca" weight="bold" />
              )}
              <View>
                <OcorrenciaId>
                  {isCreate ? 'NOVO CADASTRO' : 'EDIÇÃO OFFLINE'}
                </OcorrenciaId>
                {numero && (
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#dc2626', marginTop: 4 }}>
                    {numero}
                  </Text>
                )}
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              {new Date(item.createdAt).toLocaleString('pt-BR')}
            </Text>
          </View>

          {hasCoords(item) ? (
            <CheckCircle size={36} weight="fill" color="#16a34a" />
          ) : (
            <WarningCircle size={36} weight="fill" color="#dc2626" />
          )}
        </OcorrenciaHeader>

        <OcorrenciaFooter style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <TouchableOpacity
            onPress={() => openEdit(item)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#e0e7ff',
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <PencilSimple size={20} color="#4338ca" weight="bold" />
            <Text style={{ color: '#4338ca', fontWeight: '800' }}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendNow(item)}
            disabled={sendingIds.has(item.id) || !isConnected}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#dcfce7',
              paddingVertical: 14,
              borderRadius: 12,
              opacity: sendingIds.has(item.id) || !isConnected ? 0.6 : 1,
            }}
          >
            {sendingIds.has(item.id) ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <UploadSimple size={20} color="#16a34a" weight="fill" />
                <Text style={{ color: '#16a34a', fontWeight: '800' }}>
                  {isConnected ? 'Enviar' : 'Offline'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#fee2e2',
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <Trash size={20} color="#dc2626" weight="fill" />
            <Text style={{ color: '#dc2626', fontWeight: '800' }}>Remover</Text>
          </TouchableOpacity>
        </OcorrenciaFooter>
      </OcorrenciaCard>
    );
  };

  return (
    <Container>
      <Header>
        <View>
          <Greeting>Pendências Offline</Greeting>
          <Subtitle>{queue.length} item{queue.length !== 1 ? 's' : ''} na fila</Subtitle>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <XCircle size={32} color="#94a3b8" weight="bold" />
        </TouchableOpacity>
      </Header>

      <FlatList
        data={queue}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        refreshing={refreshing}
        onRefresh={loadQueue}
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <CheckCircle size={90} weight="duotone" color="#16a34a" />
            <EmptyText style={{ marginTop: 20, fontSize: 20, fontWeight: '700' }}>
              Tudo sincronizado!
            </EmptyText>
            <Text style={{ color: '#94a3b8', marginTop: 8 }}>
              Não há itens pendentes
            </Text>
          </View>
        )}
      />
    </Container>
  );
}