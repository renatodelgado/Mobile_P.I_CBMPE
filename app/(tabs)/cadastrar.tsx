/* eslint-disable @typescript-eslint/no-unused-vars */
// src/screens/NovaOcorrenciaRN.tsx
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { getThumbnailAsync } from "expo-video-thumbnails";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";

import { KeyboardControllerView } from "react-native-keyboard-controller";

import { useUsuarioLogado } from "@/hooks/useUsuarioLogado";
import { formatCPF } from "@/utils/formatCpf";
import { router } from "expo-router";
import MapView, { Marker, Region } from "react-native-maps";
import RNPickerSelect from "react-native-picker-select";
import SignatureScreen from "react-native-signature-canvas";
import {
  fetchGeocode,
  fetchGruposOcorrencias,
  fetchLesoes,
  fetchNaturezasOcorrencias,
  fetchReverseGeocode,
  fetchSubgruposOcorrencias,
  fetchUnidadesOperacionais,
  fetchUsuarios,
  fetchViaturas,
  postOcorrencia,
  postOcorrenciaUsuario,
  postVitima,
} from "../../services/api";
import { cadastrarStyles as styles } from "../../styles/styles";
import { uploadToCloudinary } from "../../utils/uploadToCloudinary";

type Anexo = { uri: string; name: string; type: string; thumbnail?: string };

const passos = ["Dados Básicos", "Natureza", "Localização", "Equipe e Viatura", "Vítimas", "Anexos", "Resumo"] as const;

export default function NovaOcorrenciaRN({ navigation }: any) {
  const [passoAtual, setPassoAtual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assinaturaModal, setAssinaturaModal] = useState(false);

  // Dados básicos
  const [numeroOcorrencia, setNumeroOcorrencia] = useState("");
  const [dataChamado, setDataChamado] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusAtendimento, setStatusAtendimento] = useState("Pendente");
  const [descricao, setDescricao] = useState("");

  // Natureza
  const [natureza, setNatureza] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<string | null>(null);
  const [subgrupo, setSubgrupo] = useState<string | null>(null);

  // Localização
  const [municipio, setMunicipio] = useState("");
  const [bairro, setBairro] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

  // Equipe e viatura
  const [unidade, setUnidade] = useState<string | null>(null);
  const [viatura, setViatura] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<number[]>([]);

  // === VÍTIMAS ===
  const [vitimas, setVitimas] = useState<Vitima[]>([]);
  const [modalVitimaAberto, setModalVitimaAberto] = useState(false);
  const [editandoVitima, setEditandoVitima] = useState<Vitima | null>(null);
  const [condicoesVitima, setCondicoesVitima] = useState<any[]>([]);
  const [loadingCondicoes, setLoadingCondicoes] = useState(true);

  // Anexos
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [assinaturaUrl, setAssinaturaUrl] = useState<string | null>(null);

  // Catálogos
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [subgrupos, setSubgrupos] = useState<any[]>([]);
  const [viaturasList, setViaturasList] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);

  const statusMapping: Record<string, string> = {
    "Pendente": "pendente",
    "Em andamento": "em_andamento",
    "Concluída": "concluida",
    "Não Atendido": "nao_atendido",
  };

  const usuario = useUsuarioLogado();

  const statusNormalizado = statusMapping[statusAtendimento] || "pendente";

  const signatureRef = useRef<any>(null);

  const initialVitima: Vitima = {
    id: 0,
    nome: "",
    cpf_vitima: "",
    idade: undefined,
    sexo: undefined,
    lesaoId: undefined,
    condicaoNome: undefined,
    destinoVitima: "",
    observacoes: "",
  };

  const naturezaPickerRef = useRef<any>(null);
  const grupoPickerRef = useRef<any>(null);
  const subgrupoPickerRef = useRef<any>(null);
  const statusPickerRef = useRef<any>(null);
  const unidadePickerRef = useRef<any>(null);
  const formaAcionamentoPickerRef = useRef<any>(null);
  const viaturaPickerRef = useRef<any>(null);
  const sexoPickerRef = useRef<any>(null);
  const etniaPickerRef = useRef<any>(null);
  const condicaoPickerRef = useRef<any>(null);

  type Vitima = {
    id: number;
    nome: string;
    cpf_vitima: string;
    idade?: number;
    sexo?: "M" | "F" | "O";
    etnia?: string;
    condicaoNome?: string;
    tipoAtendimento?: string;
    destinoVitima?: string;
    observacoes?: string;
    lesaoId?: number;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLesoes();
        setCondicoesVitima(data || []);
      } catch (err) {
        Alert.alert("Erro", "Falha ao carregar condições da vítima");
      } finally {
        setLoadingCondicoes(false);
      }
    })();
  }, []);

  useEffect(() => {
    const now = new Date();
    const br = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setNumeroOcorrencia(`OCR${br.toISOString().replace(/[-T:Z.]/g, "").slice(0, 14)}`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [nats, grps, subs, viats, usrs, unis] = await Promise.all([
          fetchNaturezasOcorrencias(),
          fetchGruposOcorrencias(),
          fetchSubgruposOcorrencias(),
          fetchViaturas(),
          fetchUsuarios(),
          fetchUnidadesOperacionais(),
        ]);
        setNaturezas(nats || []);
        setGrupos(grps || []);
        setSubgrupos(subs || []);
        setViaturasList(viats || []);
        setUsuarios(usrs || []);
        setUnidades(unis || []);
      } catch {
        Alert.alert("Erro", "Falha ao carregar dados");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const proximo = () => passoAtual < passos.length - 1 && setPassoAtual(p => p + 1);
  const anterior = () => passoAtual > 0 && setPassoAtual(p => p - 1);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const { width } = Dimensions.get('window');
  const scrollRef = useRef<ScrollView | null>(null);

  const onMomentumScrollEnd = (e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== passoAtual) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setPassoAtual(page);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: passoAtual * width, animated: true });
    }
  }, [passoAtual, width]);

  const tirarFotoOuVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário permitir acesso à câmera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const novo: Anexo = {
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        type: asset.type === "video" ? "video/mp4" : "image/jpeg",
      };

      if (novo.type.startsWith("video")) {
        try {
          const thumb = await getThumbnailAsync(novo.uri, { time: 1500 });
          novo.thumbnail = thumb.uri;
        } catch { }
      }

      setAnexos(prev => [...prev, novo]);
    }
  };

  const selecionarDaGaleria = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const novos = await Promise.all(result.assets.map(async (a): Promise<Anexo> => {
        const item: Anexo = {
          uri: a.uri,
          name: a.fileName || `media_${Date.now()}_${Math.random().toString(36)}.${a.type === "video" ? "mp4" : "jpg"}`,
          type: a.type === "video" ? "video/mp4" : "image/jpeg",
        };
        if (item.type.startsWith("video")) {
          try {
            const thumb = await getThumbnailAsync(item.uri, { time: 1500 });
            item.thumbnail = thumb.uri;
          } catch { }
        }
        return item;
      }));
      setAnexos(prev => [...prev, ...novos]);
    }
  };

  const removerAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMembro = (id: number) => {
    setEquipe(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const salvarAssinatura = (sig: string) => {
    setAssinaturaUrl(sig);
    setAssinaturaModal(false);
  };

  const usarMinhaLocalizacao = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "É necessário permitir o acesso à localização.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude.toString();
      const lng = loc.coords.longitude.toString();

      setLatitude(lat);
      setLongitude(lng);
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const data = await fetchReverseGeocode(loc.coords.latitude, loc.coords.longitude);
      if (data?.address) {
        setMunicipio(data.address.city || data.address.town || data.address.municipality || "");
        setBairro(data.address.suburb || data.address.neighbourhood || "");
        setLogradouro(data.address.road || "");
        setNumero(data.address.house_number || "");
        setReferencia("");
      }
    } catch (err) {
      Alert.alert("Erro", "Não foi possível obter a localização.");
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!municipio || !bairro || !logradouro || !numero) return;
      const query = `${logradouro}, ${numero}, ${bairro}, ${municipio}, Pernambuco, Brazil`;
      try {
        const res = await fetchGeocode(query);
        if (res?.[0]) {
          setLatitude(res[0].lat);
          setLongitude(res[0].lon);
          setRegion({
            latitude: parseFloat(res[0].lat),
            longitude: parseFloat(res[0].lon),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch { }
    }, 1000);
    return () => clearTimeout(timer);
  }, [municipio, bairro, logradouro, numero]);

  const onMarkerDragEnd = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLatitude(latitude.toString());
    setLongitude(longitude.toString());

    try {
      const data = await fetchReverseGeocode(latitude, longitude);
      if (data?.address) {
        setMunicipio(data.address.city || data.address.town || municipio);
        setBairro(data.address.suburb || data.address.neighbourhood || bairro);
        setLogradouro(data.address.road || logradouro);
        setNumero(data.address.house_number || numero);
      }
    } catch { }
  };

  const enviarOcorrencia = async () => {
    if (sending) return;
    setSending(true);

    if (statusAtendimento === "Não Atendido" && !descricao.trim()) {
      Alert.alert("Campo obrigatório", "Informe o motivo do não atendimento na descrição.");
      setSending(false);
      return;
    }

    try {
      const anexosEnviados: any[] = [];

      for (const arquivo of anexos) {
        try {
          const url = await uploadToCloudinary(arquivo);
          anexosEnviados.push({
            tipoArquivo: arquivo.type.startsWith("video") ? "video" : "imagem",
            urlArquivo: url,
            nomeArquivo: arquivo.name,
            extensaoArquivo: arquivo.name.split(".").pop(),
            descricao: "",
          });
        } catch (err) {
          console.warn("Falha ao enviar anexo:", arquivo.name);
        }
      }

      if (assinaturaUrl) {
        try {
          const urlAss = await uploadToCloudinary({
            uri: assinaturaUrl,
            name: `${numeroOcorrencia}_assinatura.png`,
            type: "image/png",
          });
          anexosEnviados.push({
            tipoArquivo: "assinatura",
            urlArquivo: urlAss,
            nomeArquivo: `${numeroOcorrencia}_assinatura.png`,
            extensaoArquivo: "png",
            descricao: "Assinatura do responsável",
          });
        } catch (err) {
          console.warn("Assinatura não enviada");
        }
      }



      const payload = {
        numeroOcorrencia,
        dataHoraChamada: dataChamado.toISOString(),
        statusAtendimento: statusNormalizado,
        descricao: descricao || null,
        formaAcionamento: "Aplicativo",
        usuarioId: usuario.id,
        unidadeOperacionalId: unidade ? Number(unidade) : null,
        naturezaOcorrenciaId: natureza ? Number(natureza) : null,
        grupoOcorrenciaId: grupo ? Number(grupo) : null,
        subgrupoOcorrenciaId: subgrupo ? Number(subgrupo) : null,
        viaturaId: viatura ? Number(viatura) : null,
        motivoNaoAtendimento: statusAtendimento === "Não Atendido" ? (descricao.trim() || "Sem motivo informado") : "",
        localizacao: {
          municipio: municipio || null,
          bairro: bairro || null,
          logradouro: logradouro || null,
          numero: numero || null,
          pontoReferencia: referencia || null,
          latitude: latitude || null,
          longitude: longitude || null,
        },
        anexos: anexosEnviados.length > 0 ? anexosEnviados : null,
      };

      const resp = await postOcorrencia(payload);
      const ocorrenciaId = resp.id || resp.ocorrenciaId;

      if (equipe.length > 0) {
        await Promise.all(equipe.map(id => postOcorrenciaUsuario({ ocorrenciaId, userId: id })));
      }

      if (vitimas.length > 0) {
        await Promise.all(
          vitimas.map(vitima =>
            postVitima({
              ocorrenciaId,
              nome: vitima.nome,
              cpf_vitima: vitima.cpf_vitima.replace(/\D/g, ""),
              idade: vitima.idade,
              sexo: vitima.sexo,
              lesaoId: vitima.lesaoId,
              destinoVitima: vitima.destinoVitima,
              tipoAtendimento: vitima.tipoAtendimento,
              observacoes: vitima.observacoes,
            }).catch(err => console.warn("Erro ao salvar vítima:", err))
          )
        );
      }

      Alert.alert("Sucesso!", "Ocorrência salva com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            resetForm();        // ← reseta tudo
            router.back();      // ← sai da tela (ou use router.replace se quiser forçar reload)
            // Ou se quiser ficar na mesma tela limpa:
            // router.replace("/nova-ocorrencia"); // força reload completo (opcional)
          }
        }
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Falha ao enviar ocorrência");
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    // Animação suave ao resetar
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // 1. Gera novo número de ocorrência
    const now = new Date();
    const br = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setNumeroOcorrencia(`OCR${br.toISOString().replace(/[-T:Z.]/g, "").slice(0, 14)}`);

    // 2. Reseta TODOS os estados de uma vez
    setDataChamado(new Date());
    setShowDatePicker(false);
    setStatusAtendimento("Pendente");
    setDescricao("");

    setNatureza(null);
    setGrupo(null);
    setSubgrupo(null);

    setMunicipio("");
    setBairro("");
    setLogradouro("");
    setNumero("");
    setReferencia("");
    setLatitude("");
    setLongitude("");
    setRegion(null);

    setUnidade(null);
    setViatura(null);
    setEquipe([]);

    setVitimas([]);
    setAnexos([]);
    setAssinaturaUrl(null);

    setPassoAtual(0);

  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2625" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const pickerSelectStyles = {
    inputIOS: { height: 56, paddingHorizontal: 14, fontSize: 16, color: "#333" },
    inputAndroid: { height: 56, paddingHorizontal: 14, fontSize: 16, color: "#333" },
    placeholder: { color: "#999" },
    iconContainer: { top: 16, right: 12 },
  };

  const pickerStyle = {
    inputIOS: { height: 56, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ddd", fontSize: 16, color: "#333" },
    inputAndroid: { height: 56, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#ddd", fontSize: 16, color: "#333" },
    placeholder: { color: "#666" },
    iconContainer: { top: 18, right: 12 },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <KeyboardControllerView
        style={{ flex: 1 }}
        enabled
      >

        <View style={styles.header}>
          {/* LINHA SUPERIOR: Título + Botão Limpar */}
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Nova Ocorrência</Text>
              <Text style={styles.headerSubtitle}>
                Passo {passoAtual + 1} de {passos.length} — {passos[passoAtual]}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Limpar tudo?",
                  "Todos os dados preenchidos serão perdidos.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Limpar", style: "destructive", onPress: resetForm }
                  ]
                );
              }}
              style={styles.botaoLimparHeader}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.botaoLimparTexto}>Limpar</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de progresso */}
          <View style={styles.progressBar}>
            {passos.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressSegment,
                  i <= passoAtual && styles.progressActive
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          ref={r => { scrollRef.current = r; }}
          onMomentumScrollEnd={onMomentumScrollEnd}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          automaticallyAdjustContentInsets={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        >


          {/* PASSO 0 - Dados Básicos */}
          <View style={{ width, padding: 16 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.card}>
                  <Text style={styles.label}>Número</Text>
                  <Text style={styles.numeroOcorrencia}>{String(numeroOcorrencia)}</Text>
                  <Text style={styles.label}>Data/Hora</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                    <Text style={styles.inputText}>{dataChamado.toLocaleString("pt-BR")}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker value={dataChamado} mode="datetime" onChange={(_, d) => { setShowDatePicker(false); if (d) setDataChamado(d); }} />
                  )}

                  <Text style={styles.label}>Status</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => statusPickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect ref={statusPickerRef} onValueChange={setStatusAtendimento} value={statusAtendimento} items={[
                        { label: "Pendente", value: "Pendente" },
                        { label: "Em andamento", value: "Em andamento" },
                        { label: "Concluída", value: "Concluída" },
                        { label: "Não Atendido", value: "Não Atendido" },
                      ]} style={pickerStyle} placeholder={{}} Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />} />
                    </View>
                  </TouchableOpacity>

                  {statusAtendimento === "Não Atendido" && (
                    <View style={{ backgroundColor: "#fef3c7", padding: 12, borderRadius: 8, marginTop: 10 }}>
                      <Text style={{ color: "#92400e", fontWeight: "600" }}>
                        Obrigatório: Informe o motivo do não atendimento no campo abaixo.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>Descrição</Text>
                  <TextInput placeholder="Descreva a ocorrência..." placeholderTextColor="#666" multiline value={descricao} onChangeText={setDescricao} style={styles.textArea} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          {/* PASSO 1 - Natureza */}
          <View style={{ width, padding: 16 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.card}>
                  <Text style={styles.label}>Natureza</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => naturezaPickerRef.current?.togglePicker?.()}>

                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={naturezaPickerRef}
                        onValueChange={(val) => { setNatureza(val); setGrupo(null); setSubgrupo(null); }}
                        items={naturezas.map(n => ({ label: n.nome, value: String(n.id) }))}
                        placeholder={{ label: "Selecione...", value: null }}
                        style={pickerStyle}
                        value={natureza}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />}
                      />
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.label}>Grupo</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => grupoPickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={grupoPickerRef}
                        onValueChange={(val) => { setGrupo(val); setSubgrupo(null); }}
                        items={grupos.filter(g => String(g.naturezaOcorrencia?.id) === natureza).map(g => ({ label: g.nome, value: String(g.id) }))}
                        placeholder={{ label: "Selecione...", value: null }}
                        style={pickerStyle}
                        value={grupo}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />}
                      />
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.label}>Subgrupo</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => subgrupoPickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={subgrupoPickerRef}
                        onValueChange={setSubgrupo}
                        items={subgrupos.filter(s => String(s.grupoOcorrencia?.id) === grupo).map(s => ({ label: s.nome, value: String(s.id) }))}
                        placeholder={{ label: "Selecione...", value: null }}
                        style={pickerStyle}
                        value={subgrupo}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          {/* PASSO 2 - Localização */}
          <View style={{ width, padding: 16 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.card}>
                  <TouchableOpacity onPress={usarMinhaLocalizacao} disabled={isGettingLocation} style={[styles.botaoVermelho, { marginBottom: 16 }]}>
                    {isGettingLocation ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Usar Minha Localização Atual</Text>}
                  </TouchableOpacity>

                  <TextInput placeholder="Município" placeholderTextColor="#666" value={municipio} onChangeText={setMunicipio} style={styles.input} />
                  <TextInput placeholder="Bairro" placeholderTextColor="#666" value={bairro} onChangeText={setBairro} style={styles.input} />
                  <TextInput placeholder="Logradouro" placeholderTextColor="#666" value={logradouro} onChangeText={setLogradouro} style={styles.input} />
                  <TextInput placeholder="Número" placeholderTextColor="#666" value={numero} onChangeText={setNumero} style={styles.input} keyboardType="numeric" />
                  <TextInput placeholder="Referência" placeholderTextColor="#666" value={referencia} onChangeText={setReferencia} style={styles.input} />

                  <View style={{ flexDirection: "row", gap: 8, marginVertical: 10 }}>
                    <TextInput placeholder="Latitude" placeholderTextColor="#666" value={latitude} editable={false} style={[styles.input, { flex: 1, backgroundColor: "#f0f0f0" }]} />
                    <TextInput placeholder="Longitude" placeholderTextColor="#666" value={longitude} editable={false} style={[styles.input, { flex: 1, backgroundColor: "#f0f0f0" }]} />
                  </View>

                  <View style={{ height: 300, borderRadius: 12, overflow: "hidden", marginTop: 10 }}>
                    {region ? (
                      <MapView ref={mapRef} style={{ flex: 1 }} region={region}>
                        <Marker coordinate={{ latitude: parseFloat(latitude) || -8.0476, longitude: parseFloat(longitude) || -34.877 }} draggable onDragEnd={onMarkerDragEnd} />
                      </MapView>
                    ) : (
                      <View style={{ flex: 1, backgroundColor: "#eee", justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "#666" }}>Preencha o endereço ou use sua localização</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          {/* PASSO 3 - Equipe e Viatura */}
          <View style={{ width, padding: 16 }}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.card}>
                  <Text style={styles.label}>Unidade</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => unidadePickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={unidadePickerRef}
                        onValueChange={setUnidade}
                        items={unidades.map(u => ({ label: u.nome, value: String(u.id) }))}
                        placeholder={{ label: "Selecione a unidade...", value: null }}
                        style={pickerStyle}
                        value={unidade}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />}
                      />
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.label}>Viatura</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => viaturaPickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={viaturaPickerRef}
                        onValueChange={setViatura}
                        items={viaturasList.map(v => ({ label: `${v.tipo} - ${v.placa}`, value: String(v.id) }))}
                        placeholder={{ label: "Selecione a viatura...", value: null }}
                        style={pickerStyle}
                        value={viatura}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" />}
                      />
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.label}>Equipe</Text>
                  <View style={styles.equipeGrid}>
                    {usuarios.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => toggleMembro(u.id)}
                        style={[styles.membroBtn, equipe.includes(u.id) && styles.membroSelecionado]}
                      >
                        <Text style={[styles.membroText, equipe.includes(u.id) && styles.membroTextSel]}>
                          {u.nome.split(" ")[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          {/* PASSO 4 - VÍTIMAS */}
          <View style={{ width }}>
            <ScrollView>
              <View style={{ padding: 16 }}>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Vítimas</Text>

                  {vitimas.length === 0 ? (
                    <View style={{ padding: 20, alignItems: "center" }}>
                      <Text style={{ color: "#666", fontSize: 16 }}>Nenhuma vítima cadastrada</Text>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 20 }}>
                      {vitimas.map((v, i) => (
                        <View key={v.id} style={styles.vitimaCard}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontWeight: "bold", fontSize: 16 }}>{v.nome || "Sem nome"}</Text>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity onPress={() => {
                                setEditandoVitima(v);
                                setModalVitimaAberto(true);
                              }}>
                                <Ionicons name="pencil" size={20} color="#1976d2" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => setVitimas(prev => prev.filter(x => x.id !== v.id))}>
                                <Ionicons name="trash" size={20} color="#dc2625" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={{ marginTop: 6, color: "#444" }}>
                            {v.idade ? `${v.idade} anos • ` : ""}
                            {v.sexo === "M" ? "Masculino" : v.sexo === "F" ? "Feminino" : "Outro"} • {v.condicaoNome || "Condição não informada"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.botaoVermelho}
                    onPress={() => {
                      setEditandoVitima(initialVitima);
                      setModalVitimaAberto(true);
                    }}
                  >
                    <Text style={styles.botaoTexto}>+ Adicionar Vítima</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* PASSO 5 - Anexos */}
          <View style={{ width, padding: 16 }}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity onPress={tirarFotoOuVideo} style={[styles.botaoVermelho, { flex: 1 }]}>
                    <Text style={styles.botaoTexto}>Câmera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={selecionarDaGaleria} style={[styles.botaoVermelho, { flex: 1 }]}>
                    <Text style={styles.botaoTexto}>Galeria</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal style={{ marginVertical: 10 }}>
                  {anexos.map((a, i) => (
                    <View key={i} style={{ marginRight: 10, alignItems: "center" }}>
                      {a.type && a.type.includes("video") ? (
                        a.thumbnail ? (
                          <View style={{ position: 'relative' }}>
                            <Image source={{ uri: a.thumbnail! }} style={styles.fotoThumb} />
                            <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, borderRadius: 20 }}>
                              <Text style={{ color: '#fff', fontSize: 14 }}>Play</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.videoThumb}>
                            <Text style={{ color: "#fff", fontSize: 24 }}>Play</Text>
                            <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>{a.name}</Text>
                          </View>
                        )
                      ) : (
                        <Image source={{ uri: a.uri }} style={styles.fotoThumb} />
                      )}
                      <TouchableOpacity onPress={() => removerAnexo(i)} style={{ position: "absolute", top: -8, right: -8, backgroundColor: "#dc2625", borderRadius: 15, width: 30, height: 30, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => setAssinaturaModal(true)}
                  style={[styles.botaoVermelho, { backgroundColor: assinaturaUrl ? "#2e7d32" : "#1976d2", marginTop: 20 }]}
                >
                  <Text style={styles.botaoTexto}>
                    {assinaturaUrl ? "Editar Assinatura" : "Capturar Assinatura"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* PASSO 6 - Resumo */}
          <View style={{ width, padding: 16 }}>
            <View style={styles.card}>
              <Text style={styles.resumoTitulo}>Resumo da Ocorrência</Text>
              <Text style={styles.resumoLinha}>Número: <Text style={styles.resumoValor}>{numeroOcorrencia}</Text></Text>
              <Text style={styles.resumoLinha}>Data: <Text style={styles.resumoValor}>{dataChamado.toLocaleString("pt-BR")}</Text></Text>
              <Text style={styles.resumoLinha}>Status: <Text style={styles.resumoValor}>{statusAtendimento}</Text></Text>
              <Text style={styles.resumoLinha}>Natureza: <Text style={styles.resumoValor}>{naturezas.find(n => String(n.id) === natureza)?.nome || "-"}</Text></Text>
              <Text style={styles.resumoLinha}>Local: <Text style={styles.resumoValor}>{municipio}, {bairro} ({latitude}, {longitude})</Text></Text>
              <Text style={styles.resumoLinha}>Anexos: <Text style={styles.resumoValor}>{anexos.length} arquivos</Text></Text>
              {assinaturaUrl && (
                <View style={{ marginTop: 20, alignItems: "center" }}>
                  <Text style={styles.label}>Assinatura do Responsável</Text>
                  <Image source={{ uri: assinaturaUrl! }} style={{ width: 300, height: 150, resizeMode: "contain", backgroundColor: "#f9f9f9", marginTop: 10, borderRadius: 8 }} />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {passoAtual > 0 && (
            <TouchableOpacity onPress={anterior} style={styles.botaoSecundario}>
              <Text style={styles.botaoSecundarioTexto}>Anterior</Text>
            </TouchableOpacity>
          )}

          {passoAtual < passos.length - 1 ? (
            <TouchableOpacity onPress={proximo} style={[styles.botaoVermelho, { marginLeft: "auto" }]}>
              <Text style={styles.botaoTexto}>Próximo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={enviarOcorrencia} disabled={sending} style={[styles.botaoVermelho, { marginLeft: "auto", backgroundColor: sending ? "#aaa" : "#dc2625" }]}>
              <Text style={styles.botaoTexto}>{sending ? "Enviando..." : "Finalizar"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Modal Assinatura */}
        <Modal visible={assinaturaModal} animationType="slide" transparent={false} onRequestClose={() => setAssinaturaModal(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#ddd" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>Assinatura do Responsável</Text>
                <TouchableOpacity onPress={() => setAssinaturaModal(false)}>
                  <Text style={{ color: "#dc2625", fontSize: 18, fontWeight: "bold" }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1, padding: 20 }}>
                {assinaturaUrl ? (
                  <View style={{ alignItems: "center", flex: 1, justifyContent: "center" }}>
                    <Image source={{ uri: assinaturaUrl! }} style={{ width: "100%", height: 300, resizeMode: "contain", backgroundColor: "#f9f9f9", borderRadius: 12 }} />
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 30 }}>
                      <TouchableOpacity onPress={() => { setAssinaturaUrl(null); signatureRef.current?.clearSignature(); }} style={{ backgroundColor: "#dc2625", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 }}>
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>Refazer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setAssinaturaModal(false)} style={{ backgroundColor: "#2e7d32", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 }}>
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>Confirmar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 3, borderColor: "#333" }}>
                    <SignatureScreen
                      ref={signatureRef}
                      onOK={salvarAssinatura}
                      backgroundColor="#ffffff"
                      penColor="#000000"
                      autoClear={false}
                      descriptionText="Assine aqui"
                      clearText="Limpar"
                      confirmText="Salvar"
                    />
                  </View>
                )}
              </View>

              {!assinaturaUrl && (
                <View style={{ padding: 20, flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity onPress={() => signatureRef.current?.clearSignature()} style={{ flex: 1, backgroundColor: "#666", padding: 16, borderRadius: 10, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => signatureRef.current?.readSignature()} style={{ flex: 1, backgroundColor: "#2e7d32", padding: 16, borderRadius: 10, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar Assinatura</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* Modal de Vítima - 100% CORRIGIDO */}
        <Modal visible={modalVitimaAberto} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#ddd" }}>
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>{editandoVitima?.id ? "Editar Vítima" : "Nova Vítima"}</Text>
                <TouchableOpacity onPress={() => { setModalVitimaAberto(false); setEditandoVitima(null); }}>
                  <Ionicons name="close" size={28} color="#dc2625" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <View style={styles.card}>
                  <Text style={styles.label}>Nome Completo *</Text>
                  <TextInput style={styles.input} value={editandoVitima?.nome || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, nome: t } : { ...initialVitima, nome: t })} placeholder="Nome da vítima" placeholderTextColor="#999" />

                  <Text style={styles.label}>CPF</Text>
                  <TextInput style={styles.input} value={editandoVitima?.cpf_vitima || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, cpf_vitima: formatCPF(t) } : { ...initialVitima, cpf_vitima: formatCPF(t) })} placeholder="000.000.000-00" keyboardType="numeric" maxLength={14} placeholderTextColor="#999" />

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Idade</Text>
                      <TextInput placeholder="Ex. 35" style={styles.input} value={editandoVitima?.idade?.toString() || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, idade: t ? Number(t) : undefined } : { ...initialVitima, idade: t ? Number(t) : undefined })} keyboardType="numeric" placeholderTextColor="#999" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Sexo</Text>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => sexoPickerRef.current?.togglePicker?.()}>
                        <View pointerEvents="none">
                          <RNPickerSelect
                            ref={sexoPickerRef}
                            value={editandoVitima?.sexo || null}
                            onValueChange={(v) => setEditandoVitima(prev => prev ? { ...prev, sexo: v } : { ...initialVitima, sexo: v })}
                            items={[{ label: "Masculino", value: "M" }, { label: "Feminino", value: "F" }, { label: "Outro", value: "O" }]}
                            style={pickerStyle}
                            placeholder={{ label: "Selecione", value: null }}
                            Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" style={{ marginRight: 10 }} />}
                          />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.label}>Condição da Vítima *</Text>
                  {loadingCondicoes ? <ActivityIndicator color="#dc2625" /> : (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => condicaoPickerRef.current?.togglePicker?.()}>
                      <View pointerEvents="none">
                        <RNPickerSelect
                          ref={condicaoPickerRef}
                          value={editandoVitima?.lesaoId || null}
                          onValueChange={(v) => {
                            const cond = condicoesVitima.find(c => c.id === v);
                            setEditandoVitima(prev => prev ? { ...prev, lesaoId: v, condicaoNome: cond?.tipoLesao } : { ...initialVitima, condicaoId: v, condicaoNome: cond?.tipoLesao });
                          }}
                          items={condicoesVitima.map(c => ({ label: c.tipoLesao, value: c.id }))}
                          style={pickerStyle}
                          placeholder={{ label: "Selecione a condição", value: null }}
                          Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" style={{ marginRight: 10 }} />}
                        />
                      </View>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.label}>Destino</Text>
                  <TextInput style={styles.input} value={editandoVitima?.destinoVitima || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, destinoVitima: t } : { ...initialVitima, destinoVitima: t })} placeholder="Ex: UPA, Hospital..." placeholderTextColor="#999" />

                  <Text style={styles.label}>Tipo de Atendimento</Text>
                  <TextInput style={styles.input} value={editandoVitima?.tipoAtendimento || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, tipoAtendimento: t } : { ...initialVitima, tipoAtendimento: t })} placeholder="Ex: Ambulatório, Emergência..." placeholderTextColor="#999" />

                  <Text style={styles.label}>Observações</Text>
                  <TextInput style={[styles.input, { height: 100, textAlignVertical: "top", paddingTop: 14 }]} value={editandoVitima?.observacoes || ""} onChangeText={(t) => setEditandoVitima(prev => prev ? { ...prev, observacoes: t } : { ...initialVitima, observacoes: t })} multiline placeholder="Digite as observações" placeholderTextColor="#999" />

                  <TouchableOpacity
                    style={[styles.botaoVermelho, { marginTop: 20 }]}
                    onPress={() => {
                      if (!editandoVitima?.nome?.trim() || !editandoVitima?.lesaoId) {
                        Alert.alert("Atenção", "Nome e condição da vítima são obrigatórios");
                        return;
                      }
                      const novaVitima = { ...editandoVitima, id: editandoVitima.id || Date.now(), nome: editandoVitima.nome.trim() } as Vitima;
                      if (editandoVitima.id) {
                        setVitimas(prev => prev.map(v => v.id === editandoVitima.id ? novaVitima : v));
                      } else {
                        setVitimas(prev => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          return editandoVitima.id
                            ? prev.map(v => v.id === editandoVitima.id ? novaVitima : v)
                            : [...prev, novaVitima];
                        });
                      }
                      setModalVitimaAberto(false);
                      setEditandoVitima(null);
                    }}
                  >
                    <Text style={styles.botaoTexto}>Salvar Vítima</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </KeyboardControllerView>
    </SafeAreaView>
  );
}

// styles are now imported from `app/styles.tsx` as `cadastrarStyles`