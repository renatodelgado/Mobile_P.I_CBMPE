/* eslint-disable react-hooks/rules-of-hooks */
// app/(tabs)/ocorrencias.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Funnel,
  Hourglass,
  MapPin,
  Siren,
  Users,
  WarningCircle,
  X
} from "phosphor-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useTheme as useStyledTheme } from "styled-components/native";
import { fetchOcorrenciasUsuario } from "../../services/api";
import {
  Container,
  DateContainer,
  DateText,
  EmptyText,
  Header,
  InfoRow,
  InfoText,
  OcorrenciaCard,
  OcorrenciaFooter,
  OcorrenciaHeader,
  OcorrenciaId,
  OcorrenciaInfo,
  StatusText,
  Subtitle,
  Title,
} from "../../styles/styles";
import { useTheme } from "../theme";

import { useUsuarioLogado } from "../../hooks/useUsuarioLogado";

type Ocorrencia = {
  origId: number;
  idLabel: string;
  data: string;
  hora: string;
  natureza: string;
  localizacao: string;
  viatura: string;
  status: "Pendente" | "Em andamento" | "Atendida" | "Não Atendida";
  descricao: string;
  isEquipe: boolean;
  isCriadaPorMim: boolean;
  timestamp: number;
};

type TabType = "todas" | "criadas" | "equipe";

export default function MinhasOcorrencias() {
  const { id: usuarioLogadoId } = useUsuarioLogado();

  if (!usuarioLogadoId) {
    return (
      <Container>
        <StatusBar barStyle="dark-content" />
        <Header>
          <Title>Minhas Ocorrências</Title>
        </Header>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#dc2625" />
          <Text style={{ marginTop: 16, color: "#64748b" }}>Carregando usuário...</Text>
        </View>
      </Container>
    );
  }
  
  const router = useRouter();
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { dark } = useTheme();
  const styledTheme: any = useStyledTheme();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("todas");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filtros
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroNatureza, setFiltroNatureza] = useState("");
  const [filtroViatura, setFiltroViatura] = useState("");
   const [filtroStatus, setFiltroStatus] = useState<string[]>(["Pendente", "Em andamento", "Atendida", "Não Atendida"]);

  // Unified picker state (fixes iOS layering and duplicated pickers)
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"inicio" | "fim" | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState(new Date());

const hoje = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

const [filtroInicio, setFiltroInicio] = useState<Date | null>(null);
const [filtroFim, setFiltroFim] = useState<Date | null>(null);


  // Abas fixas (ordem usada para swipe left/right)
  const tabsList: TabType[] = ["todas", "criadas", "equipe"];

  const nextTab = () => {
    setActiveTab(prev => {
      const i = tabsList.indexOf(prev);
      return tabsList[Math.min(i + 1, tabsList.length - 1)];
    });
  };

  const prevTab = () => {
    setActiveTab(prev => {
      const i = tabsList.indexOf(prev);
      return tabsList[Math.max(i - 1, 0)];
    });
  };

  // PanResponder para detectar swipes horizontais sem atrapalhar scroll vertical
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // ativa quando o movimento horizontal é dominante e passa um limiar pequeno
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        // threshold para considerar swipe
        const SWIPE_DISTANCE = 50;
        const SWIPE_VELOCITY = 0.2;

        if (dx < -SWIPE_DISTANCE && Math.abs(vx) > SWIPE_VELOCITY) {
          // swipe para a esquerda -> próxima aba
          nextTab();
        } else if (dx > SWIPE_DISTANCE && Math.abs(vx) > SWIPE_VELOCITY) {
          // swipe para a direita -> aba anterior
          prevTab();
        }
      },
    })
  ).current;

  const titulo = status
    ? status === "Pendente" ? "Ocorrências Pendentes"
      : status === "Em andamento" ? "Em Andamento"
        : status === "Atendida" ? "Atendidas"
          : "Minhas Ocorrências"
    : activeTab === "todas" ? "Todas as Ocorrências"
      : activeTab === "criadas" ? "Criadas por Mim"
        : "Parte da Equipe";

  const temFiltrosAtivos = filtroBusca || filtroNatureza || filtroViatura || filtroInicio || filtroFim || filtroStatus.length < 4;

  const carregar = useCallback(async () => {
    setRefreshing(true);
    setApiError(null);
    try {
      const raw = await fetchOcorrenciasUsuario(usuarioLogadoId);

      const mapped: Ocorrencia[] = (raw || []).map((o: any) => {
        const date = o.dataHoraChamada ? new Date(o.dataHoraChamada) : new Date();
        const desc = o.descricao?.trim() || "Sem descrição disponível";

        const statusRaw = String(o.statusAtendimento || "").toLowerCase().trim();
        const status =
          statusRaw === "pendente" ? "Pendente" :
            statusRaw.includes("andamento") ? "Em andamento" :
              statusRaw === "atendida" ? "Atendida" :
                statusRaw.includes("não") ? "Não Atendida" :
                  statusRaw.includes("nao") ? "Não Atendida" :
                  "Desconhecido";

        const criadoPorMim = o.usuario?.id === usuarioLogadoId;

        return {
          origId: o.id,
          idLabel: o.numeroOcorrencia || `#OCR-${o.id}`,
          data: date.toLocaleDateString("pt-BR"),
          hora: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          natureza: o.naturezaOcorrencia?.nome || "Não informada",
          localizacao: o.localizacao
            ? `${o.localizacao.municipio}, ${o.localizacao.bairro || "bairro não informado"}`
            : "Localização não informada",
          viatura: o.viatura ? `${o.viatura.tipo}-${o.viatura.numero}` : "Sem viatura alocada",
          status: status as any,
          descricao: desc,
          isEquipe: !criadoPorMim,
          isCriadaPorMim: criadoPorMim,
          timestamp: date.getTime(),
        };
      });

      mapped.sort((a, b) => {
        if (a.status === "Pendente" && b.status !== "Pendente") return -1;
        if (a.status !== "Pendente" && b.status === "Pendente") return 1;
        return b.timestamp - a.timestamp;
      });

      try {
        // debug logs suppressed
      } catch {}

      setOcorrencias(mapped);
    } catch (err: any) {
      console.error("Erro ao carregar ocorrências:", err);
      try {
        setApiError(err?.message ? String(err.message) : String(err));
      } catch {
        setApiError("Erro desconhecido ao carregar ocorrências");
      }
    } finally {
      setRefreshing(false);
    }
  }, [usuarioLogadoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filteredOcorrencias = useMemo(() => {
    let list = ocorrencias;

    // Aba
    if (activeTab === "criadas") list = list.filter(o => o.isCriadaPorMim);
    else if (activeTab === "equipe") list = list.filter(o => o.isEquipe);

    // Status do link (ex: ?status=Pendente)
    if (status) list = list.filter(o => o.status === status);

    // Filtros avançados
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      list = list.filter(o =>
        o.idLabel.toLowerCase().includes(busca) ||
        o.localizacao.toLowerCase().includes(busca) ||
        o.descricao.toLowerCase().includes(busca)
      );
    }

    if (filtroNatureza) {
      list = list.filter(o => o.natureza.toLowerCase().includes(filtroNatureza.toLowerCase()));
    }

    if (filtroViatura) {
      list = list.filter(o => o.viatura.toLowerCase().includes(filtroViatura.toLowerCase()));
    }

    if (filtroInicio) {
      const inicio = new Date(filtroInicio);
      inicio.setHours(0, 0, 0, 0);
      list = list.filter(o => o.timestamp >= inicio.getTime());
    }

    if (filtroFim) {
      const fim = new Date(filtroFim);
      fim.setHours(23, 59, 59, 999);
      list = list.filter(o => o.timestamp <= fim.getTime());
    }

    if (filtroStatus.length < 4) {
      list = list.filter(o => filtroStatus.includes(o.status));
    }

    return list;
  }, [ocorrencias, activeTab, status, filtroBusca, filtroNatureza, filtroViatura, filtroInicio, filtroFim, filtroStatus]);

  const limparFiltros = () => {
    setFiltroBusca("");
    setFiltroNatureza("");
    setFiltroViatura("");
    setFiltroInicio(null);
    setFiltroFim(null);
    setFiltroStatus(["Pendente", "Em andamento", "Atendida", "Não Atendida"]);
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "Pendente": return <WarningCircle size={22} weight="fill" color={styledTheme.danger} />;
      case "Em andamento": return <Hourglass size={22} weight="fill" color={styledTheme.info} />;
      case "Atendida": return <CheckCircle size={22} weight="fill" color={styledTheme.success} />;
      case "Não Atendida": return <X size={22} weight="fill" color={styledTheme.muted} />;
      default: return null;
    }
  };

  const getStatusColor = (s: string) =>
    s === "Pendente" ? styledTheme.danger : s === "Não Atendida" ? styledTheme.muted : s === "Em andamento" ? styledTheme.info : styledTheme.success;

  // Open picker helper
const openPicker = (target: "inicio" | "fim") => {
  const initial = target === "inicio" ? (filtroInicio || new Date()) : (filtroFim || new Date());
  setPickerTarget(target);
  setPickerTempDate(initial);
  setShowPicker(true);
};

  // Note: selection is handled directly by the modal picker onConfirm

  return (
    <Container>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={styledTheme.surface} />

      {/* Header com botão de filtro */}
      <Header>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={28} color={styledTheme.textPrimary} />
          </TouchableOpacity>
          <Title>{titulo}</Title>
        </View>

        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={{
            padding: 10,
            backgroundColor: temFiltrosAtivos ? styledTheme.danger : styledTheme.surface,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Funnel size={20} color={temFiltrosAtivos ? styledTheme.surface : styledTheme.muted} weight="bold" />
          {temFiltrosAtivos && <View style={{ backgroundColor: styledTheme.surface, borderRadius: 6, width: 8, height: 8 }} />}
        </TouchableOpacity>
      </Header>

      {/* Abas */}
      <View {...panResponder.panHandlers} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <View style={{
          flexDirection: "row",
          backgroundColor: styledTheme.surface,
          borderRadius: 12,
          padding: 4,
          gap: 4,
        }}>
          {(["todas", "criadas", "equipe"] as TabType[]).map((tab) => {
            const label = tab === "todas" ? "Todas" : tab === "criadas" ? "Criadas por Mim" : "Parte da Equipe";
            const isActive = activeTab === tab;

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isActive ? styledTheme.surface : "transparent",
                  alignItems: "center",
                  elevation: isActive ? 3 : 0,
                }}
              >
                <Text style={{
                  fontSize: 13.5,
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? styledTheme.textPrimary : styledTheme.textSecondary,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {status && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: styledTheme.surface,
            padding: 12,
            borderRadius: 12,
            elevation: 2,
          }}>
            <Subtitle>Filtro ativo: {status}</Subtitle>
            <TouchableOpacity onPress={() => router.replace("/ocorrencias")}>
              <Text style={{ color: styledTheme.danger, fontWeight: "600" }}>Limpar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {apiError && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <View style={{ backgroundColor: styledTheme.surface, padding: 12, borderRadius: 12, elevation: 2 }}>
            <Text style={{ color: styledTheme.danger, fontWeight: "700", marginBottom: 8 }}>Erro ao carregar ocorrências</Text>
            <Text style={{ color: styledTheme.textSecondary, marginBottom: 10 }}>{apiError}</Text>
            <TouchableOpacity onPress={carregar} style={{ padding: 10, backgroundColor: styledTheme.danger, borderRadius: 10, alignItems: "center" }}>
              <Text style={{ color: styledTheme.surface, fontWeight: "700" }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={carregar} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
      >
        {filteredOcorrencias.length === 0 ? (
          <EmptyText>
            {temFiltrosAtivos
              ? "Nenhuma ocorrência encontrada com os filtros aplicados"
              : activeTab === "todas"
                ? "Nenhuma ocorrência encontrada"
                : activeTab === "criadas"
                  ? "Você ainda não criou nenhuma ocorrência"
                  : "Você não participa de nenhuma equipe no momento"}
          </EmptyText>
        ) : (
          filteredOcorrencias.map((item) => (
            <OcorrenciaCard
              key={item.origId}
              onPress={() => router.push(`/ocorrencia/${item.origId}`)}
              style={{ marginBottom: 16 }}
            >
              <OcorrenciaHeader>
                <View>
                  <OcorrenciaId>{item.idLabel}</OcorrenciaId>
                  {item.isEquipe && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <Users size={14} color={styledTheme.danger} weight="fill" />
                      <Text style={{ fontSize: 11, color: styledTheme.danger, marginLeft: 4, fontWeight: "600" }}>
                        Você está na equipe
                      </Text>
                    </View>
                  )}
                  {item.isCriadaPorMim && !item.isEquipe && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: styledTheme.success, fontWeight: "600" }}>
                        Criada por você
                      </Text>
                    </View>
                  )}
                </View>
                {getStatusIcon(item.status)}
              </OcorrenciaHeader>

              <OcorrenciaInfo>
                <InfoRow>
                  <Siren size={18} color={styledTheme.muted} weight="fill" />
                  <InfoText style={{ fontWeight: "600" }}>{item.natureza}</InfoText>
                </InfoRow>
                <InfoRow>
                  <MapPin size={18} color={styledTheme.muted} />
                  <InfoText numberOfLines={2}>{item.localizacao}</InfoText>
                </InfoRow>
                <InfoRow>
                  <Car size={18} color={styledTheme.muted} />
                  <InfoText>{item.viatura}</InfoText>
                </InfoRow>
              </OcorrenciaInfo>

              <View style={{ paddingHorizontal: 4, marginTop: 8 }}>
                <Text style={{ fontSize: 13.5, color: styledTheme.textSecondary, lineHeight: 19 }}>
                  {item.descricao.length > 120
                    ? item.descricao.substring(0, 117) + "..."
                    : item.descricao}
                </Text>
              </View>

              <OcorrenciaFooter>
                <DateContainer>
                  <Calendar size={14} color={styledTheme.muted} />
                  <DateText>{item.data} • {item.hora}</DateText>
                </DateContainer>
                <StatusText style={{ color: getStatusColor(item.status), fontWeight: "700" }}>
                  {item.status}
                </StatusText>
              </OcorrenciaFooter>
            </OcorrenciaCard>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
      </View>

      {/* MODAL DE FILTROS */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: styledTheme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 40,
            maxHeight: "90%",
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: styledTheme.textPrimary }}>Filtros</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={28} color={styledTheme.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Busca livre */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: styledTheme.textSecondary, marginBottom: 6 }}>Busca livre</Text>
                <TextInput
                  placeholder="ID, local, descrição..."
                  value={filtroBusca}
                  onChangeText={setFiltroBusca}
                    style={{
                    borderWidth: 1,
                    borderColor: styledTheme.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Natureza */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: styledTheme.textSecondary, marginBottom: 6 }}>Natureza</Text>
                <TextInput
                  placeholder="Ex: Roubo, Acidente..."
                  value={filtroNatureza}
                  onChangeText={setFiltroNatureza}
                    style={{
                    borderWidth: 1,
                    borderColor: styledTheme.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Viatura */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: styledTheme.textSecondary, marginBottom: 6 }}>Viatura</Text>
                <TextInput
                  placeholder="Ex: PM-1234"
                  value={filtroViatura}
                  onChangeText={setFiltroViatura}
                  style={{
                    borderWidth: 1,
                    borderColor: styledTheme.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 15,
                  }}
                />
              </View>

              {/* Período */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: styledTheme.textSecondary, marginBottom: 6 }}>
                  Período
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => openPicker("inicio")}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: styledTheme.border,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: filtroInicio ? styledTheme.textPrimary : styledTheme.muted, fontSize: 15 }}>
                        {filtroInicio ? filtroInicio.toLocaleDateString("pt-BR") : hoje.toLocaleDateString("pt-BR")}
                    </Text>
                    <Calendar size={18} color={styledTheme.muted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openPicker("fim")}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: styledTheme.border,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: filtroFim ? styledTheme.textPrimary : styledTheme.muted, fontSize: 15 }}>
                        {filtroFim ? filtroFim.toLocaleDateString("pt-BR") : hoje.toLocaleDateString("pt-BR")}
                    </Text>
                    <Calendar size={18} color={styledTheme.muted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: styledTheme.textSecondary, marginBottom: 10 }}>Status</Text>
                {["Pendente", "Em andamento", "Atendida", "Não Atendida"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setFiltroStatus(prev =>
                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                      );
                    }}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: filtroStatus.includes(s) ? styledTheme.danger : styledTheme.border,
                      backgroundColor: filtroStatus.includes(s) ? styledTheme.danger : styledTheme.surface,
                      marginRight: 10,
                    }}>
                      {filtroStatus.includes(s) && <CheckCircle size={16} color={styledTheme.surface} weight="fill" />}
                    </View>
                    <Text style={{ fontSize: 15, color: styledTheme.textPrimary }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ações */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={limparFiltros}
                  style={{
                    flex: 1,
                    padding: 14,
                    backgroundColor: styledTheme.surface,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "600", color: styledTheme.muted }}>Limpar tudo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={{
                    flex: 2,
                    padding: 14,
                    backgroundColor: styledTheme.danger,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: styledTheme.surface }}>Aplicar filtros</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Modal date picker (cross-platform) */}
          <DateTimePickerModal
            isVisible={showPicker}
            mode="date"
            date={pickerTempDate}
            onConfirm={(date) => {
              if (pickerTarget === "inicio") setFiltroInicio(date);
              if (pickerTarget === "fim") setFiltroFim(date);
              setShowPicker(false);
              setPickerTarget(null);
            }}
            onCancel={() => {
              setShowPicker(false);
              setPickerTarget(null);
            }}
          />
        </View>
      </Modal>
    </Container>
  );
}
