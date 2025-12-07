/* eslint-disable import/no-named-as-default-member */
/* eslint-disable react-hooks/rules-of-hooks */
// app/index.tsx
import NetInfo from '@react-native-community/netinfo';
import { Link, useRouter } from "expo-router";
import {
  Calendar, Car, CheckCircle, Gear, Hourglass, MapPin, Siren, Users, WarningCircle
} from "phosphor-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated, Dimensions, RefreshControl, StatusBar, Text, TouchableOpacity, View
} from "react-native";
import { useTheme as useStyledTheme } from "styled-components/native";
import { fetchOcorrenciasUsuario, fetchUsuario } from "../../services/api";
import offlineService from '../../services/offline';
import { useAuthStore } from "../../store/authStore";
import {
  Container, DateContainer, DateText, EmptyText, Greeting,
  Header,
  InfoRow, InfoText, LoaderContainer,
  OcorrenciaCard, OcorrenciaFooter, OcorrenciaHeader, OcorrenciaId, OcorrenciaInfo,
  RowLeft,
  Scroll, Section, SectionHeader, SectionTitle, StatIcon, StatLabel, StatsGrid,
  StatusText, StatValue, StyledStatCard, Subtitle, VerTodas
} from "../../styles/styles";



const AnimatedScroll = Animated.createAnimatedComponent(Scroll);
const { height } = Dimensions.get("window");

export default function Dashboard() {
  const router = useRouter();
  const styledTheme: any = useStyledTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioNome, setUsuarioNome] = useState("Usuário");
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);

  const { user } = useAuthStore();

  if (!user) {
    return (
      <Container>
        <LoaderContainer>
          <ActivityIndicator size="large" color={styledTheme.danger} />
          <Subtitle>Carregando usuário...</Subtitle>
        </LoaderContainer>
      </Container>
    );
  }

  const usuarioLogadoId = user.id;

  const ITEM_HEIGHT = 160;
  const CENTER_RATIO = 0.38;
  const centerY = Math.round(height * CENTER_RATIO);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [usuario, raw] = await Promise.all([
        fetchUsuario(usuarioLogadoId),
        fetchOcorrenciasUsuario(usuarioLogadoId),
      ]);

      if (usuario?.nome) setUsuarioNome(usuario.nome.split(" ")[0]);

      const mapped = (raw || []).map((o: any) => {
        const date = o.dataHoraChamada ? new Date(o.dataHoraChamada) : new Date();
        const data = date.toLocaleDateString("pt-BR");
        const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        const statusRaw = String(o.statusAtendimento || "").toLowerCase().trim();
        const status =
          statusRaw === "pendente" ? "Pendente" :
            statusRaw.includes("andamento") ? "Em andamento" :
              statusRaw === "concluida" || statusRaw === "concluída" ? "Concluída" :
                "Não Atendida";

        const descCurta = o.descricao
          ? o.descricao.length > 80 ? o.descricao.substring(0, 77) + "..." : o.descricao
          : "Sem descrição disponível";

        const criadoPorMim = o.usuario?.id === usuarioLogadoId;

        return {
          origId: o.id,
          idLabel: o.numeroOcorrencia || `#OCR-${o.id}`,
          data, hora,
          natureza: o.naturezaOcorrencia?.nome || "Não informada",
          localizacao: o.localizacao
            ? `${o.localizacao.municipio}, ${o.localizacao.bairro || "bairro não informado"}`
            : "Localização não informada",
          viatura: o.viatura ? `${o.viatura.tipo}-${o.viatura.numero}` : "Não alocada",
          status,
          descricaoCurta: descCurta,
          isEquipe: !criadoPorMim,
          isCriadaPorMim: criadoPorMim,
          timestamp: date.getTime(),
        };
      });

      // MESMA REGRA: Pendentes primeiro, depois por data decrescente
      mapped.sort((a, b) => {
        if (a.status === "Pendente" && b.status !== "Pendente") return -1;
        if (a.status !== "Pendente" && b.status === "Pendente") return 1;
        return b.timestamp - a.timestamp;
      });

      try {
        // suppressed index debug logs
      } catch {}

      setOcorrencias(mapped);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [usuarioLogadoId]);

  useEffect(() => { loadData(); }, [loadData]);

  // subscribe to offline queue and attempt processing periodically + trigger on reconnection
  useEffect(() => {
    let mounted = true;
    const update = (q: any[]) => { if (!mounted) return; setPendingSyncs(Array.isArray(q) ? q.length : 0); };
    const unsub = offlineService.subscribe((q: any[]) => update(q));
    offlineService.getQueueLength().then(n => { if (mounted) setPendingSyncs(n); });

    // process once at start
    offlineService.processQueue().catch(() => {});

    const interval = setInterval(() => {
      offlineService.processQueue().catch(() => {});
      offlineService.getQueueLength().then(n => { if (mounted) setPendingSyncs(n); });
    }, 20000);

    // NetInfo listener: on connect, try sync immediately
    const netUnsub = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        offlineService.processQueue().catch(() => {});
      }
    });

    return () => { mounted = false; unsub(); clearInterval(interval); netUnsub(); };
  }, []);

  const stats = useMemo(() => {
    const total = ocorrencias.length;
    const pendente = ocorrencias.filter(o => o.status === "Pendente").length;
    const andamento = ocorrencias.filter(o => o.status === "Em andamento").length;
    const concluidas = ocorrencias.filter(o => o.status === "Concluída").length;
    return { total, pendente, andamento, concluidas };
  }, [ocorrencias]);

  const StatCard = ({ icon, label, value, color, statusFilter }: any) => (
    <StyledStatCard onPress={() => router.push(statusFilter ? `/ocorrencias?status=${statusFilter}` : "/ocorrencias")}>
      <StatIcon>{icon}</StatIcon>
      <StatValue>{value}</StatValue>
      <StatLabel>{label}</StatLabel>
    </StyledStatCard>
  );

  if (loading) {
    return (
      <Container>
        <StatusBar barStyle="dark-content" backgroundColor={styledTheme.surface} />
        <LoaderContainer>
          <ActivityIndicator size="large" color={styledTheme.danger} />
          <Subtitle>Carregando dados...</Subtitle>
        </LoaderContainer>
      </Container>
    );
  }

  return (
    <Container>
      <StatusBar barStyle="dark-content" backgroundColor={styledTheme.surface} />

      <Header>
        <View style={{ padding: 0 }}>
          <Greeting>Olá, {usuarioNome}!</Greeting>
          <Subtitle>Suas ocorrências em tempo real</Subtitle>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push("/configuracoes")}>
            <Gear size={26} color={styledTheme.textSecondary} />
          </TouchableOpacity>
        </View>
      </Header>

      <AnimatedScroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} />}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: centerY - (ITEM_HEIGHT / 2),
          paddingBottom: height * 0.3,
        }}
      >
        {pendingSyncs > 0 ? (
  <TouchableOpacity
    activeOpacity={0.95}
    onPress={() => router.push('/sincronizacao')}
    style={{
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      backgroundColor: '#fee2e2',
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: 1.5,
      borderColor: '#dc2626',
      shadowColor: '#dc2626',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    }}
  >
    <View style={{
      backgroundColor: '#dc2626',
      padding: 14,
      borderRadius: 50,
      alignSelf: 'flex-start',
    }}>
      <WarningCircle size={32} weight="fill" color="#fff" />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={{
        fontSize: 18,
        fontWeight: '800',
        color: '#991b1b',
        marginBottom: 4,
      }}>
        Atenção: {pendingSyncs} {pendingSyncs > 1 ? 'ações' : 'ação'} pendente{pendingSyncs > 1 ? 's' : ''}
      </Text>
      <Text style={{
        fontSize: 15,
        color: '#7f1d1d',
        lineHeight: 20,
      }}>
        Você tem cadastros ou edições não enviadas. Conecte-se para sincronizar agora ou modifique aqui a lista de pendências.
      </Text>
    </View>
  </TouchableOpacity>
) : (
  /* Card discreto quando tudo está sincronizado */
  <View style={{
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#16a34a30',
  }}>
    <CheckCircle size={28} weight="fill" color="#16a34a" />
    <View>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#166534' }}>
        Tudo sincronizado
      </Text>
      <Text style={{ fontSize: 14, color: '#166534', opacity: 0.8 }}>
        Não há ações pendentes
      </Text>
    </View>
  </View>
)}

{/* Seus 4 minicards normais (Total, Pendentes, etc) */}
<StatsGrid>
  <StatCard icon={<Siren size={28} weight="fill" color={styledTheme.danger} />} label="Total" value={stats.total} />
  
  <StatCard icon={<WarningCircle size={28} weight="fill" color={styledTheme.danger} />} label="Pendentes" value={stats.pendente} statusFilter="Pendente" />
  
  <StatCard icon={<Hourglass size={28} weight="fill" color={styledTheme.info} />} label="Em Andamento" value={stats.andamento} statusFilter="Em andamento" />
  
  <StatCard icon={<CheckCircle size={28} weight="fill" color={styledTheme.success} />} label="Concluídas" value={stats.concluidas} statusFilter="Concluída" />
</StatsGrid>

        <Section>

          <SectionHeader>
            <SectionTitle>Ocorrências Recentes</SectionTitle>
            <TouchableOpacity onPress={() => router.push("/ocorrencias")}>
              <VerTodas>Ver todas →</VerTodas>
            </TouchableOpacity>
          </SectionHeader>

          {ocorrencias.length === 0 ? (
            <EmptyText>Nenhuma ocorrência encontrada</EmptyText>
          ) : (
            ocorrencias.slice(0, 8).map((item, index) => {
              const inputRange = [
                (index - 1) * ITEM_HEIGHT,
                index * ITEM_HEIGHT,
                (index + 1) * ITEM_HEIGHT,
              ];

              const scale = scrollY.interpolate({
                inputRange,
                outputRange: [0.96, 1, 0.96],
                extrapolate: "clamp",
              });

              const translateY = scrollY.interpolate({
                inputRange,
                outputRange: [6, 0, 6],
                extrapolate: "clamp",
              });

              const opacity = scrollY.interpolate({
                inputRange,
                outputRange: [0.85, 1, 0.85],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={item.origId}
                  style={{
                    transform: [{ scale }, { translateY }],
                    opacity,
                    marginBottom: 16,
                  }}
                >
                  <Link href={{ pathname: '/ocorrencia/[id]', params: { id: String(item.origId) } }} asChild>
                    <OcorrenciaCard>
                      <OcorrenciaHeader>
                        <View>
                          <OcorrenciaId>{item.idLabel}</OcorrenciaId>
                          {item.isEquipe && (
                            <RowLeft style={{ marginTop: 4 }}>
                              <Users size={14} color={styledTheme.danger} weight="fill" />
                              <Text style={{ fontSize: 11, color: styledTheme.danger, marginLeft: 4, fontWeight: "600" }}>
                                Você está na equipe
                              </Text>
                            </RowLeft>
                          )}
                        </View>
                        {item.status === "Pendente" && <WarningCircle size={22} weight="fill" color="#EF4444" />}
                        {item.status === "Em andamento" && <Hourglass size={22} weight="fill" color="#3B82F6" />}
                        {item.status === "Concluída" && <CheckCircle size={22} weight="fill" color="#10B981" />}
                      </OcorrenciaHeader>

                      <OcorrenciaInfo>
                        <InfoRow><Siren size={16} color={styledTheme.textSecondary} weight="fill" /><InfoText style={{ fontWeight: "600" }}>{item.natureza}</InfoText></InfoRow>
                        <InfoRow><MapPin size={16} color={styledTheme.textSecondary} /><InfoText numberOfLines={2}>{item.localizacao}</InfoText></InfoRow>
                        <InfoRow><Car size={16} color={styledTheme.textSecondary} /><InfoText>{item.viatura}</InfoText></InfoRow>
                      </OcorrenciaInfo>

                      <Animated.View style={{}}>
                        <Text style={{ fontSize: 13, color: styledTheme.textSecondary, marginTop: 8, fontStyle: "italic" }}>
                          {item.descricaoCurta}
                        </Text>
                      </Animated.View>

                      <OcorrenciaFooter>
                        <DateContainer>
                          <Calendar size={14} color={styledTheme.muted} />
                          <DateText>{item.data} • {item.hora}</DateText>
                        </DateContainer>
                        <StatusText style={{
                          color: item.status === "Pendente" ? styledTheme.danger :
                            item.status === "Em andamento" ? styledTheme.info : styledTheme.success,
                          fontWeight: "700"
                        }}>
                          {item.status}
                        </StatusText>
                      </OcorrenciaFooter>
                    </OcorrenciaCard>
                  </Link>
                </Animated.View>
              );
            })
          )}
        </Section>
        <View style={{ height: 100 }} />
      </AnimatedScroll>
    </Container>
  );
}