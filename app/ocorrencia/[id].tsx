/* eslint-disable @typescript-eslint/no-unused-vars */
// app/ocorrencia/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import RNPickerSelect from "react-native-picker-select";
import { useTheme as useStyledTheme } from "styled-components/native";

import {
  ArrowLeft,
  Building,
  Calendar,
  Check,
  CheckCircle,
  FirstAidKit,
  GenderFemale,
  GenderMale,
  Heartbeat,
  Hospital,
  Hourglass,
  IdentificationCard,
  Palette,
  PencilSimple,
  User,
  WarningCircle,
  X,
} from "phosphor-react-native";

import {
  deleteAnexo,
  deleteVitima,
  fetchEquipeOcorrencia,
  fetchGeocode,
  fetchGruposOcorrencias,
  fetchLesoes,
  fetchNaturezasOcorrencias,
  fetchReverseGeocode,
  fetchSubgruposOcorrencias,
  fetchUsuarios,
  fetchViaturas,
  fetchVitimasPorOcorrencia,
  getOcorrenciaPorId,
  postVitima,
  prepararAnexos,
  processarUploadsArquivos,
  putOcorrencia,
  putVitima,
  Usuario
} from "../../services/api";

import {
  AssinaturaBox,
  AssinaturaImg,
  cadastrarStyles,
  Card,
  ClassificacaoChip,
  ClassificacaoTexto,
  Container,
  GalleryImage,
  IDEmptyText,
  IDHeader,
  IDHeaderTitle,
  IDInfoRow,
  IDSectionTitle,
  InfoSubvalue,
  InfoValue,
  ModalBackdrop,
  ModalCloseButton,
  ModalImage,
  NumeroOcorrencia,
  ObsText,
  StatusCard,
  StatusLabel,
  cadastrarStyles as styles,
  VitimaCard,
  VitimaHeader,
  VitimaInfo,
  VitimaNome
} from "../../styles/styles";
import { formatCPF } from "../../utils/formatCpf";
import { useTheme } from "../theme";


type Anexo = { id?: number; urlArquivo: string; nomeArquivo: string; tipoArquivo: string };
type LocalAnexo = { uri: string; name: string; type: string; thumbnail?: string };

type Vitima = {
  id: number | string;
  nome: string;
  cpfVitima: string;
  idade: number;
  sexo: "M" | "F" | "O" | "";
  tipoAtendimento: string;
  observacoes?: string;
  etnia?: "branca" | "preta" | "parda" | "amarela" | "indigena" | "outro" | "";
  destinoVitima?: string;
  condicaoNome?: string;
  lesaoId?: number;

};

type Ocorrencia = {
  usuario: any;
  unidadeOperacional: any;
  viatura?: {
    id: number;
    tipo: string;
    numero: string;
    placa: string;
  };
  id: number;
  numeroOcorrencia: string;
  dataHoraChamada: string;
  statusAtendimento: string;
  descricao: string;
  formaAcionamento: string;
  naturezaOcorrencia: { id: number; nome: string };
  grupoOcorrencia?: { id: number; nome: string };
  subgrupoOcorrencia?: { id: number; nome: string };
  localizacao?: {
    municipio: string;
    bairro: string;
    logradouro: string;
    numero: string;
    pontoReferencia?: string;
    latitude?: string;
    longitude?: string;
  };
  anexos?: Anexo[];
};

export default function OcorrenciaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const styledTheme: any = useStyledTheme();
  const { dark } = useTheme();

  const [ocorrencia, setOcorrencia] = useState<Ocorrencia | null>(null);
  const [vitimas, setVitimas] = useState<Vitima[]>([]);
  const [equipe, setEquipe] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVitimaVisible, setModalVitimaVisible] = useState(false);
  const [vitimaEmEdicao, setVitimaEmEdicao] = useState<Vitima | null>(null);
  const [loadingCondicoes, setLoadingCondicoes] = useState(true);
  const [condicoesVitima, setCondicoesVitima] = useState<any[]>([]);


  // Natureza
  const [natureza, setNatureza] = useState<string | null>(null);
  const [grupo, setGrupo] = useState<string | null>(null);
  const [subgrupo, setSubgrupo] = useState<string | null>(null);

  // Catálogos
  const [naturezas, setNaturezas] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [subgrupos, setSubgrupos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [viaturas, setViaturas] = useState<any[]>([]);
  const [viaturaTipoNumero, setViaturaTipoNumero] = useState(""); // ex: "USB-01"
  const [viaturaPlaca, setViaturaPlaca] = useState("");

  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null);

  // Campos editáveis
  const [editable, setEditable] = useState({
    descricao: "",
    formaAcionamento: "",
    statusAtendimento: "pendente",
    naturezaId: null as number | null,
    grupoId: null as number | null,
    subgrupoId: null as number | null,
    municipio: "",
    bairro: "",
    logradouro: "",
    numero: "",
    pontoReferencia: "",
    latitude: "",
    longitude: "",
    lesaoId: null as number | null,
  });

  const [anexosNovos, setAnexosNovos] = useState<LocalAnexo[]>([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [buscandoCoords, setBuscandoCoords] = useState(false);
  const [region, setRegion] = useState<any>(null);
  const mapRef = useRef<MapView>(null);

  const formasAcionamento = [
    { label: "Telefone", value: "Telefone" },
    { label: "Rádio", value: "Rádio" },
    { label: "Presencial", value: "Presencial" },
    { label: "Aplicativo", value: "Aplicativo" },
  ];

  const pickerStyle = {
    inputIOS: {
      height: 56,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: dark ? "#1f2937" : "#fafafa",
      borderWidth: 1,
      borderColor: dark ? "#374151" : "#ddd",
      fontSize: 16,
      color: dark ? "#f3f4f6" : "#1f2937",
      paddingTop: 18,
      paddingBottom: 18,
    },
    inputAndroid: {
      height: 56,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: dark ? "#1f2937" : "#fafafa",
      borderWidth: 1,
      borderColor: dark ? "#374151" : "#ddd",
      fontSize: 16,
      color: dark ? "#f3f4f6" : "#1f2937",
    },
    placeholder: {
      color: dark ? "#9ca3af" : "#94a3b8",
    },
    iconContainer: {
      top: 18,
      right: 12,
    },
  };

  const pickerTextColor = dark ? "#f3f4f6" : "#1f2937";
  const naturezaPickerRef = useRef<any>(null);
  const grupoPickerRef = useRef<any>(null);
  const subgrupoPickerRef = useRef<any>(null);
  const statusPickerRef = useRef<any>(null);
  const formaAcionamentoPickerRef = useRef<any>(null);
  const viaturaPickerRef = useRef<any>(null);
  const sexoPickerRef = useRef<any>(null);
  const etniaPickerRef = useRef<any>(null);
  const condicaoPickerRef = useRef<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ocData, vitData, nat, grp, sub, usr, vtr] = await Promise.all([
          getOcorrenciaPorId(id),
          fetchVitimasPorOcorrencia(id),
          fetchNaturezasOcorrencias(),
          fetchGruposOcorrencias(),
          fetchSubgruposOcorrencias(),
          fetchUsuarios(),
          fetchViaturas()
        ]);

        const usuarioCriador = ocData?.usuario;
        if (usuarioCriador) {
          setUsuarioLogado({
            id: usuarioCriador.id,
            nome: usuarioCriador.nome,
          });
        } else {
          // Ou pegue do AsyncStorage, ou deixe null por enquanto
          setUsuarioLogado(null);
        }

        if (ocData) {
          const normalized: Ocorrencia = {
            id: ocData.id,
            usuario: ocData.usuario || undefined,
            unidadeOperacional: ocData.unidadeOperacional || undefined,
            numeroOcorrencia: ocData.numeroOcorrencia || "",
            dataHoraChamada: ocData.dataHoraChamada || "",
            statusAtendimento: ocData.statusAtendimento || "",
            descricao: ocData.descricao || "",
            formaAcionamento: ocData.formaAcionamento || "",
            naturezaOcorrencia: {
              id: ocData.naturezaOcorrencia?.id ?? 0,
              nome: ocData.naturezaOcorrencia?.nome ?? "",
            },
            grupoOcorrencia: ocData.grupoOcorrencia || undefined,
            subgrupoOcorrencia: ocData.subgrupoOcorrencia || undefined,
            localizacao: ocData.localizacao
              ? {
                municipio: ocData.localizacao.municipio || "",
                bairro: ocData.localizacao.bairro || "",
                logradouro: ocData.localizacao.logradouro || "",
                numero: ocData.localizacao.numero || "",
                pontoReferencia: ocData.localizacao.pontoReferencia || undefined,
                latitude: ocData.localizacao.latitude || undefined,
                longitude: ocData.localizacao.longitude || undefined,
              }
              : undefined,
            viatura: ocData.viatura
              ? {
                id: ocData.viatura.id || 0,
                tipo: ocData.viatura.tipo || "",
                numero: ocData.viatura.numero || "",
                placa: ocData.viatura.placa || "",
              }
              : undefined,
            anexos: Array.isArray(ocData.anexos)
              ? ocData.anexos.map((a: any) => ({
                id: a.id,
                urlArquivo: a.urlArquivo ?? "",
                nomeArquivo: a.nomeArquivo ?? "",
                tipoArquivo: a.tipoArquivo ?? "",
              }))
              : [],
          };
          setOcorrencia(normalized);

          const usuarioCriador = ocData.usuario;
          if (usuarioCriador) {
            setUsuarioLogado({
              id: usuarioCriador.id,
              nome: usuarioCriador.nome,
              matricula: usuarioCriador.matricula,
            });
          }


        } else {
          setOcorrencia(null);
        }

        const normalizarFormaAcionamento = (valor: string | null | undefined): string => {
          if (!valor) return "";

          const mapa: { [key: string]: string } = {
            telefone: "Telefone",
            rádio: "Rádio",
            radio: "Rádio",
            presencial: "Presencial",
            aplicativo: "Aplicativo",
            app: "Aplicativo",
            "via app": "Aplicativo",
            "via aplicativo": "Aplicativo",
          };

          const chave = valor.toLowerCase().trim();
          return mapa[chave] || valor.charAt(0).toUpperCase() + valor.slice(1).trim();
        };

        setVitimas(
          Array.isArray(vitData)
            ? vitData.map((v: any) => ({
              id: v.id,
              nome: v.nome || "",
              cpfVitima: v.cpf_vitima || v.cpfVitima || "",
              idade: v.idade || 0,
              sexo: (v.sexo || "M").toUpperCase() as "M" | "F" | "O",
              tipoAtendimento: v.tipo_atendimento || v.tipoAtendimento || "",
              observacoes: v.observacoes || v.observacao || "",
              etnia: v.etnia || "",
              destinoVitima: v.destino_vitima || v.destinoVitima || "",
              lesaoId: (v.lesao_id || v.lesaoId || v.lesao?.id) ? Number(v.lesao_id || v.lesaoId || v.lesao?.id) : undefined,
              condicaoNome: v.condicaoNome || v.lesao?.tipoLesao || v.lesao?.tipo_lesao || null,
            }))
            : []
        );
        setNaturezas(nat || []);
        setGrupos(grp || []);
        setSubgrupos(sub || []);
        setUsuarios(usr || []);
        setViaturas(vtr || []);

        setEditable({
          descricao: ocData?.descricao || "",
          formaAcionamento: normalizarFormaAcionamento(ocData?.formaAcionamento),
          statusAtendimento: ocData?.statusAtendimento || "pendente",
          naturezaId: ocData?.naturezaOcorrencia?.id || null,
          grupoId: ocData?.grupoOcorrencia?.id || null,
          subgrupoId: ocData?.subgrupoOcorrencia?.id || null,
          municipio: ocData?.localizacao?.municipio || "",
          bairro: ocData?.localizacao?.bairro || "",
          logradouro: ocData?.localizacao?.logradouro || "",
          numero: ocData?.localizacao?.numero || "",
          pontoReferencia: ocData?.localizacao?.pontoReferencia || "",
          latitude: ocData?.localizacao?.latitude || "",
          longitude: ocData?.localizacao?.longitude || "",
          lesaoId: null,
        });

        if (ocData?.localizacao?.latitude && ocData?.localizacao?.longitude) {
          setRegion({
            latitude: parseFloat(ocData.localizacao.latitude),
            longitude: parseFloat(ocData.localizacao.longitude),
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }

        if (ocData?.viatura) {
          setViaturaTipoNumero(`${ocData.viatura.tipo}-${ocData.viatura.numero || ""}`.trim());
          setViaturaPlaca(ocData.viatura.placa || "");
        }

        const eq = await fetchEquipeOcorrencia(id);
        setEquipe(Array.isArray(eq) ? eq : []);
      } catch (e) {
        console.error(e);
        Alert.alert("Erro", "Não foi possível carregar a ocorrência");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  useEffect(() => {
    if (!ocorrencia) return;

    const natId = ocorrencia.naturezaOcorrencia?.id;
    const grpId = ocorrencia.grupoOcorrencia?.id;
    const subId = ocorrencia.subgrupoOcorrencia?.id;

    setNatureza(natId ? String(natId) : null);
    setGrupo(grpId ? String(grpId) : null);
    setSubgrupo(subId ? String(subId) : null);

    // Também garante que o editable esteja sincronizado
    setEditable(prev => ({
      ...prev,
      naturezaId: natId || null,
      grupoId: grpId || null,
      subgrupoId: subId || null,
    }));
  }, [ocorrencia]);

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
    if (!editable.latitude || !editable.longitude || !mapRef.current) return;

    const lat = parseFloat(editable.latitude);
    const lon = parseFloat(editable.longitude);

    if (isNaN(lat) || isNaN(lon)) return;

    // Força o mapa a ir para a nova posição com animação
    mapRef.current.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      1000
    );
  }, [editable.latitude, editable.longitude]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const getStatus = (s: string) => {
    switch (s) {
      case "pendente": return { label: "Pendente", color: "#dc2626", bg: "#FEE2E2", icon: WarningCircle };
      case "em_andamento": return { label: "Em Andamento", color: "#3b82f6", bg: "#DBEAFE", icon: Hourglass };
      case "concluida": return { label: "Concluída", color: "#22c55e", bg: "#DCFCE7", icon: CheckCircle };
      default: return { label: s, color: "#64748b", bg: "#F3F4F6", icon: null };
    }
  };

  const status = ocorrencia ? getStatus(ocorrencia.statusAtendimento) : null;

  const isConcluida = ocorrencia?.statusAtendimento === "concluida";

  const usarMinhaLocalizacao = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permissão negada", "Localização necessária");

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude.toString();
      const lng = loc.coords.longitude.toString();

      setEditable(prev => ({ ...prev, latitude: lat, longitude: lng }));
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const data = await fetchReverseGeocode(loc.coords.latitude, loc.coords.longitude);
      if (data?.address) {
        setEditable(prev => ({
          ...prev,
          municipio: data.address.city || data.address.town || prev.municipio,
          bairro: data.address.suburb || data.address.neighbourhood || prev.bairro,
          logradouro: data.address.road || prev.logradouro,
          numero: data.address.house_number || prev.numero,
        }));
      }
    } catch {
      Alert.alert("Erro", "Não foi possível obter localização");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleNaturezaChange = (value: React.SetStateAction<string | null>) => {
    setNatureza(value);
    setGrupo(null);
    setSubgrupo(null);

    setEditable(prev => ({
      ...prev,
      naturezaId: value ? Number(value) : null,
      grupoId: null,
      subgrupoId: null
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      // 1. Validações básicas
      if (!editable.naturezaId || !editable.grupoId) {
        Alert.alert("Campos obrigatórios", "Natureza e Grupo são obrigatórios.");
        return;
      }

      // 2. Processa uploads de anexos novos
      let anexosFinais: any[] = [];
      if (anexosNovos.length > 0) {
        const arquivosParaUpload = anexosNovos.map(a => ({
          uri: a.uri,
          name: a.name || `anexo_${Date.now()}`,
          type: a.type || "image/jpeg",
        }));
        const uploaded = await processarUploadsArquivos(arquivosParaUpload);
        const novosFormatados = prepararAnexos(uploaded, undefined, ocorrencia?.numeroOcorrencia || "");
        anexosFinais = [...(ocorrencia?.anexos?.filter(a => a.tipoArquivo !== "assinatura") || []), ...novosFormatados];
      } else {
        anexosFinais = ocorrencia?.anexos?.filter(a => a.tipoArquivo !== "assinatura") || [];
      }

      // 3. Monta payload da ocorrência (o segredo está aqui!)
      const payloadOcorrencia = {
        descricao: editable.descricao.trim(),
        statusAtendimento: editable.statusAtendimento,
        formaAcionamento: editable.formaAcionamento || null,
        naturezaOcorrencia: { id: editable.naturezaId },
        grupoOcorrencia: { id: editable.grupoId },
        subgrupoOcorrencia: editable.subgrupoId ? { id: editable.subgrupoId } : null,
        viatura: ocorrencia?.viatura ? { id: ocorrencia.viatura.id } : null,
        localizacao: {
          municipio: editable.municipio || null,
          bairro: editable.bairro || null,
          logradouro: editable.logradouro || null,
          numero: editable.numero || null,
          complemento: null,
          pontoReferencia: editable.pontoReferencia || null,
          latitude: editable.latitude || null,
          longitude: editable.longitude || null,
        },
        // FORMATO CORRETO QUE O BACKEND ACEITA:
        anexos: anexosFinais.map(a => ({
          urlArquivo: a.urlArquivo || a.url_arquivo,
          nomeArquivo: a.nomeArquivo || a.nome_arquivo || "anexo",
          extensaoArquivo: a.extensaoArquivo || a.extensao_arquivo || a.urlArquivo.split(".").pop(),
          tipoArquivo: a.tipoArquivo || a.tipo_arquivo || (a.urlArquivo.includes(".pdf") ? "arquivo" : "imagem"),
          descricao: a.descricao || "",
        })),
      };

      // 4. Atualiza ocorrência
      await putOcorrencia(Number(id), payloadOcorrencia);

      // 5. Sincroniza vítimas (VERSÃO CORRIGIDA E ROBUSTA)
      // ==================== SINCRONIZAÇÃO DE VÍTIMAS (CORRIGIDA 100%) ====================
      const vitimasBackendResponse = await fetchVitimasPorOcorrencia(id);
      const vitimasBackend = Array.isArray(vitimasBackendResponse) ? vitimasBackendResponse : [];
      const idsBackend = new Set(vitimasBackend.map((v: any) => v.id));

      // Função auxiliar para montar payload EXATAMENTE como o backend espera
      const montarPayloadVitima = (vitima: Vitima) => {
        const cpfLimpo = vitima.cpfVitima?.replace(/\D/g, "") || null;

        return {
          ocorrenciaId: Number(id),
          nome: (vitima.nome || "").trim(),
          cpf_vitima: cpfLimpo && cpfLimpo.length === 11 ? cpfLimpo : null,
          idade: vitima.idade > 0 ? Number(vitima.idade) : null,
          sexo: vitima.sexo || "M",
          etnia: vitima.etnia || null,
          // Enviar tanto snake_case quanto camelCase para maior compatibilidade
          destino_vitima: vitima.destinoVitima?.trim() || null,
          destinoVitima: vitima.destinoVitima?.trim() || null,
          tipo_atendimento: vitima.tipoAtendimento?.trim() || null,
          tipoAtendimento: vitima.tipoAtendimento?.trim() || null,
          observacoes: vitima.observacoes?.trim() || null,
          // Alguns backends aceitam objeto lesao: { id } enquanto outros esperam lesao_id/lesaoId
          lesao: vitima.lesaoId ? { id: vitima.lesaoId } : null,
          lesao_id: typeof vitima.lesaoId === 'number' ? vitima.lesaoId : null,
          lesaoId: typeof vitima.lesaoId === 'number' ? vitima.lesaoId : null,
        };
      };

      // 1. Cria ou atualiza vítimas
      for (const vitima of vitimas) {
        const payload = montarPayloadVitima(vitima);

        // Validação mínima antes de mandar
        if (!payload.nome) {
          Alert.alert("Erro na vítima", "O nome da vítima é obrigatório.");
          throw new Error("Nome da vítima vazio");
        }

        try {
          if (typeof vitima.id === "string" && vitima.id.startsWith("temp_")) {
            // Nova vítima → POST
            const nova = await postVitima(payload);
            // Opcional: já substitui o id temporário pelo real
            vitima.id = nova.id;
          } else if (typeof vitima.id === "number" && idsBackend.has(vitima.id)) {
            // Atualiza vítima existente → PUT
            await putVitima(vitima.id, payload);
          }
          // Se o id não existir mais no backend (foi excluída fora do app), só ignora
        } catch (err: any) {
          console.error("Erro ao salvar vítima:", vitima, err.response?.data || err);

          let mensagem = "Erro ao salvar vítima";

          if (err.response?.status === 422 || err.response?.status === 400) {
            const erroBackend = err.response?.data;
            if (erroBackend?.message?.includes("CPF") || erroBackend?.erro?.includes("CPF")) {
              mensagem = `CPF já cadastrado ou inválido: ${vitima.cpfVitima || "não informado"}`;
            } else if (erroBackend?.message?.includes("nome")) {
              mensagem = "Nome da vítima é obrigatório";
            } else {
              mensagem = erroBackend?.message || "Dados inválidos da vítima";
            }
          }

          Alert.alert("Erro na vítima", `${vitima.nome || "Vítima sem nome"}\n\n${mensagem}`);
          throw new Error(mensagem); // interrompe o salvamento geral
        }
      }

      // 2. Remove vítimas que foram excluídas localmente
      const idsLocal = new Set(vitimas.filter(v => typeof v.id === "number").map(v => v.id) as number[]);

      for (const idBackend of idsBackend) {
        if (!idsLocal.has(idBackend)) {
          try {
            await deleteVitima(idBackend);
          } catch (e) {
            console.warn("Não conseguiu deletar vítima do backend (já excluída?)", idBackend);
            // não interrompe o fluxo
          }
        }
      }

      // 6. Atualiza estado com dados frescos
      const [ocorrenciaAtualizada, vitimasAtualizadas] = await Promise.all([
        getOcorrenciaPorId(id),
        fetchVitimasPorOcorrencia(id),
      ]);

      setOcorrencia(ocorrenciaAtualizada as any);
      setVitimas(vitimasAtualizadas.map((v: any) => ({
        id: v.id,
        nome: v.nome || "",
        cpfVitima: v.cpf_vitima || v.cpfVitima || "",
        idade: v.idade || 0,
        sexo: (v.sexo || "M").toUpperCase() as "M" | "F" | "O",
        tipoAtendimento: v.tipoAtendimento || v.tipo_atendimento || "",
        observacoes: v.observacoes || v.observacao || "",
        etnia: v.etnia || "",
        destinoVitima: v.destinoVitima || v.destino_vitima || "",
        lesaoId: v.lesao_id || v.lesaoId || null,
        condicaoNome: v.condicaoNome || v.lesao?.tipoLesao || v.lesao?.tipo_lesao || null,
      })));

      setAnexosNovos([]); // limpa anexos pendentes
      setEditMode(false);
      Alert.alert("Sucesso", "Ocorrência salva com sucesso!");

    } catch (err: any) {
      console.error("Erro completo no handleSave:", err);
      Alert.alert(
        "Erro ao salvar",
        err.message || "Ocorreu um erro inesperado. Verifique os dados e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    router.replace(`/ocorrencia/${id}`);
  };

  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" color="#dc2626" style={{ flex: 1 }} />
      </Container>
    );
  }

  if (!ocorrencia) {
    return <Text style={{ textAlign: "center", marginTop: 50 }}>Ocorrência não encontrada</Text>;
  }

  const imagens = ocorrencia.anexos?.filter(a => a.tipoArquivo !== "assinatura") || [];
  const assinatura = ocorrencia.anexos?.find((a) => a.tipoArquivo === "assinatura");

  return (
    <Container>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={styledTheme.surface} />

      <IDHeader>
        <TouchableOpacity onPress={() => editMode ? handleCancel() : router.back()}>
          {editMode ? <X size={28} color="#dc2625" /> : <ArrowLeft size={28} color="#dc2625" />}
        </TouchableOpacity>

        <IDHeaderTitle>
          {editMode ? "Editando Ocorrência" : "Detalhes da Ocorrência"}
        </IDHeaderTitle>

        {/* Botão direito: salvar, editar ou espaço vazio (para manter o título centralizado) */}
        {editMode ? (
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#22c55e" /> : <Check size={28} color="#22c55e" weight="bold" />}
          </TouchableOpacity>
        ) : isConcluida ? (
          <View style={{ width: 36, height: 36 }} />
        ) : (
          <TouchableOpacity onPress={() => setEditMode(true)}>
            <PencilSimple size={26} color="#dc2626" />
          </TouchableOpacity>
        )}
      </IDHeader>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card><NumeroOcorrencia>{ocorrencia.numeroOcorrencia}</NumeroOcorrencia>

            {/* STATUS */}
            {status && !editMode ? (
              <>
                <StatusCard style={{ backgroundColor: status.bg }}>
                  {status.icon && <status.icon size={28} weight="fill" color={status.color} />}
                  <StatusLabel style={{ color: status.color }}>{status.label}</StatusLabel>
                </StatusCard>

                {/* Aviso para ocorrência concluída */}
                {isConcluida && (
                  <View style={{
                    backgroundColor: "#FEF3C7",
                    padding: 12,
                    borderRadius: 10,
                    marginTop: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "#FDBA74"
                  }}>
                    <WarningCircle size={24} color="#D97706" weight="fill" />
                    <Text style={{ color: "#92400E", fontWeight: "600", flex: 1 }}>
                      Esta ocorrência foi concluída e não pode mais ser editada.
                    </Text>
                  </View>
                )}
              </>
            ) : editMode ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={cadastrarStyles.label}>Status do Atendimento</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => statusPickerRef.current?.togglePicker?.()}>
                  <View pointerEvents="none">
                    <RNPickerSelect
                      ref={statusPickerRef}
                      onValueChange={(value) => {
                        if (value === "concluida") {
                          Alert.alert(
                            "Concluir ocorrência",
                            "Você está prestes a concluir esta ocorrência. Após isso ela será fechada e não poderá mais ser editada.\n\nDeseja continuar?",
                            [
                              { text: "Cancelar", style: "cancel", onPress: () => setEditable(prev => ({ ...prev, statusAtendimento: prev.statusAtendimento })) },
                              {
                                text: "Sim, concluir",
                                style: "destructive",
                                onPress: () => setEditable(prev => ({ ...prev, statusAtendimento: "concluida" })),
                              },
                            ],
                            { cancelable: true }
                          );
                        } else {
                          setEditable(prev => ({ ...prev, statusAtendimento: value }));
                        }
                      }}
                      value={editable.statusAtendimento}
                      items={[
                        { label: "Pendente", value: "pendente" },
                        { label: "Em Andamento", value: "em_andamento" },
                        { label: "Concluída", value: "concluida" },
                      ]}
                      placeholder={{}}
                      style={pickerStyle}
                      Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                      useNativeAndroidPickerStyle={false}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}
          </Card>

          {/* CLASSIFICAÇÃO */}
          <Card>
            <IDSectionTitle>Classificação da Ocorrência</IDSectionTitle>

            {/* NATUREZA */}
            <Text style={cadastrarStyles.label}>Natureza</Text>
            {editMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => naturezaPickerRef.current?.togglePicker?.()}
                style={styles.pickerWrapper}
              >
                <View pointerEvents="none">
                  <RNPickerSelect
                    ref={naturezaPickerRef}
                    onValueChange={(value) => {
                      setNatureza(value);
                      setGrupo(null);
                      setSubgrupo(null);
                      setEditable(prev => ({
                        ...prev,
                        naturezaId: value ? Number(value) : null,
                        grupoId: null,
                        subgrupoId: null,
                      }));
                    }}
                    value={natureza}
                    items={naturezas.map(n => ({ label: n.nome, value: String(n.id) }))}
                    placeholder={{ label: "Selecione a natureza...", value: null }}
                    style={pickerStyle}
                    Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <ClassificacaoChip>
                <ClassificacaoTexto>{ocorrencia.naturezaOcorrencia?.nome || "Não informada"}</ClassificacaoTexto>
              </ClassificacaoChip>
            )}

            {/* GRUPO */}
            <Text style={cadastrarStyles.label}>Grupo</Text>
            {editMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => grupoPickerRef.current?.togglePicker?.()}
                style={styles.pickerWrapper}
              >
                <View pointerEvents="none">
                  <RNPickerSelect
                    ref={grupoPickerRef}
                    onValueChange={(value) => {
                      setGrupo(value);
                      setSubgrupo(null);
                      setEditable(prev => ({
                        ...prev,
                        grupoId: value ? Number(value) : null,
                        subgrupoId: null,
                      }));
                    }}
                    value={grupo}
                    items={grupos
                      .filter(g => g.naturezaOcorrencia?.id && String(g.naturezaOcorrencia.id) === natureza)
                      .map(g => ({ label: g.nome, value: String(g.id) }))}
                    placeholder={{ label: natureza ? "Selecione o grupo..." : "Selecione primeiro a natureza", value: null }}
                    style={pickerStyle}
                    disabled={!natureza}
                    Icon={() => <Ionicons name="chevron-down" size={24} color={natureza ? "#dc2626" : "#aaa"} />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </TouchableOpacity>
            ) : ocorrencia.grupoOcorrencia ? (
              <ClassificacaoChip style={{ backgroundColor: "#E0E7FF" }}>
                <ClassificacaoTexto style={{ color: "#3730A3" }}>{ocorrencia.grupoOcorrencia.nome}</ClassificacaoTexto>
              </ClassificacaoChip>
            ) : null}

            {/* SUBGRUPO */}
            <Text style={cadastrarStyles.label}>Subgrupo</Text>
            {editMode ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => subgrupoPickerRef.current?.togglePicker?.()}
                style={styles.pickerWrapper}
              >
                <View pointerEvents="none">
                  <RNPickerSelect
                    ref={subgrupoPickerRef}
                    onValueChange={(value) => {
                      setSubgrupo(value);
                      setEditable(prev => ({
                        ...prev,
                        subgrupoId: value ? Number(value) : null,
                      }));
                    }}
                    value={subgrupo}
                    items={subgrupos
                      .filter(s => s.grupoOcorrencia?.id && String(s.grupoOcorrencia.id) === grupo)
                      .map(s => ({ label: s.nome, value: String(s.id) }))}
                    placeholder={{ label: grupo ? "Selecione o subgrupo..." : "Selecione primeiro o grupo", value: null }}
                    style={pickerStyle}
                    disabled={!grupo}
                    Icon={() => <Ionicons name="chevron-down" size={24} color={grupo ? "#dc2626" : "#aaa"} />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <ClassificacaoChip
                style={{
                  backgroundColor: ocorrencia.subgrupoOcorrencia ? "#FEF3C7" : "#F3F4F6",
                  borderWidth: ocorrencia.subgrupoOcorrencia ? 0 : 1,
                  borderColor: "#E2E8F0"
                }}
              >
                <ClassificacaoTexto
                  style={{
                    color: ocorrencia.subgrupoOcorrencia ? "#92400E" : "#64748B",
                    fontStyle: ocorrencia.subgrupoOcorrencia ? "normal" : "italic"
                  }}
                >
                  {ocorrencia.subgrupoOcorrencia?.nome || "Subgrupo não selecionado"}
                </ClassificacaoTexto>
              </ClassificacaoChip>
            )}
          </Card>

          {/* INFORMAÇÕES BÁSICAS */}
          <Card>
            <IDSectionTitle>Informações</IDSectionTitle>
            <IDInfoRow><Calendar size={20} color="#64748b" /><InfoValue>{formatDate(ocorrencia.dataHoraChamada)}</InfoValue></IDInfoRow>

            <Text style={cadastrarStyles.label}>Forma de acionamento</Text>
            {editMode ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => formaAcionamentoPickerRef.current?.togglePicker?.()}>
                <View pointerEvents="none">
                  <RNPickerSelect
                    ref={formaAcionamentoPickerRef}
                    onValueChange={(v) => {
                      setEditable(prev => ({ ...prev, formaAcionamento: v || "" }));
                    }}
                    value={editable.formaAcionamento}  // ← não use || null
                    items={[
                      { label: "Telefone", value: "Telefone" },
                      { label: "Rádio", value: "Rádio" },
                      { label: "Presencial", value: "Presencial" },
                      { label: "Aplicativo", value: "Aplicativo" },
                    ]}
                    placeholder={{ label: "Selecione a forma...", value: "" }}  // ← valor vazio = string vazia
                    style={pickerStyle}
                    Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                    useNativeAndroidPickerStyle={false}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <InfoValue>{ocorrencia.formaAcionamento || "Não informada"}</InfoValue>
            )}

            <Text style={cadastrarStyles.label}>Descrição</Text>
            {editMode ? (
              <TextInput
                style={[cadastrarStyles.textArea, { marginTop: 8 }]}
                value={editable.descricao}
                onChangeText={t => setEditable(prev => ({ ...prev, descricao: t }))}
                multiline
                placeholderTextColor="#666"
              />
            ) : <InfoValue>{ocorrencia.descricao || "Sem descrição"}</InfoValue>}

          </Card>

          {/* LOCALIZAÇÃO */}
          {ocorrencia.localizacao && (
            <Card>
              <IDSectionTitle>Localização</IDSectionTitle>

              {/* Botão "Usar minha localização" */}
              {editMode && (
                <TouchableOpacity
                  onPress={usarMinhaLocalizacao}
                  disabled={gettingLocation}
                  style={[cadastrarStyles.botaoVermelho, { marginBottom: 16 }]}
                >
                  <Text style={cadastrarStyles.botaoTexto}>
                    {gettingLocation ? "Obtendo localização..." : "Usar minha localização"}
                  </Text>
                </TouchableOpacity>
              )}

              {editMode ? (
                <>
                  {/* Campos individuais */}
                  {["municipio", "bairro", "logradouro", "numero", "pontoReferencia"].map(field => (
                    <TextInput
                      placeholderTextColor="#666"
                      key={field}
                      style={cadastrarStyles.input}
                      placeholder={
                        field === "pontoReferencia" ? "Ponto de referência" :
                          field.charAt(0).toUpperCase() + field.slice(1)
                      }
                      value={editable[field as keyof typeof editable] as string}
                      onChangeText={t => setEditable(prev => ({ ...prev, [field]: t }))}
                    />
                  ))}

                  {/* Coordenadas (editáveis manualmente) */}
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: "#f3f4f6", borderRadius: 10 }}>
                    <Text style={{ fontSize: 14, color: "#64748b", marginBottom: 8, fontWeight: "600" }}>
                      Coordenadas (clique no mapa ou use os botões acima para alterar)
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: "#475569" }}>Latitude</Text>
                        <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1f2937" }}>
                          {editable.latitude || "—"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={{ fontSize: 13, color: "#475569" }}>Longitude</Text>
                        <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1f2937" }}>
                          {editable.longitude || "—"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Botão para buscar coordenadas */}
                  <TouchableOpacity
                    onPress={async () => {
                      const endereco = [
                        editable.logradouro,
                        editable.numero,
                        editable.bairro,
                        editable.municipio || "Brasil"
                      ].filter(Boolean).join(", ");

                      if (!endereco || endereco.length < 5) {
                        Alert.alert("Atenção", "Digite um endereço válido para buscar");
                        return;
                      }

                      try {
                        setBuscandoCoords(true);

                        const results = await fetchGeocode(endereco);

                        if (!results || results.length === 0) {
                          Alert.alert("Não encontrado", "Nenhum local encontrado com esse endereço");
                          return;
                        }

                        const { lat, lon } = results[0];

                        // Atualiza coordenadas
                        setEditable(prev => ({
                          ...prev,
                          latitude: lat.toString(),
                          longitude: lon.toString(),
                        }));

                        setRegion({
                          latitude: lat,
                          longitude: lon,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        });

                        // Reverse geocode para melhorar os campos
                        const reverse = await fetchReverseGeocode(lat, lon);
                        if (reverse?.address) {
                          setEditable(prev => ({
                            ...prev,
                            municipio: reverse.address.city || reverse.address.town || prev.municipio,
                            bairro: reverse.address.suburb || reverse.address.neighbourhood || prev.bairro,
                            logradouro: reverse.address.road || prev.logradouro,
                            numero: reverse.address.house_number || prev.numero,
                          }));
                        }

                        Alert.alert("Sucesso!", `Local encontrado:\n${reverse.address.road || reverse.address.neighbourhood || reverse.address.suburb || reverse.address.city || reverse.address.town || "Endereço desconhecido"}`);
                      } catch (err) {
                        console.log(err);
                        Alert.alert("Erro", "Não foi possível buscar o endereço");
                      } finally {
                        setBuscandoCoords(false);
                      }
                    }}
                    style={[cadastrarStyles.botaoVermelho, { marginBottom: 16 }]}
                  >
                    <Text style={cadastrarStyles.botaoTexto}>
                      Atualizar Coordenadas
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Modo visualização */
                <>
                  <InfoValue style={{ marginBottom: 8 }}>
                    {[
                      ocorrencia.localizacao.logradouro,
                      ocorrencia.localizacao.numero,
                      ocorrencia.localizacao.bairro,
                      ocorrencia.localizacao.municipio
                    ].filter(Boolean).join(", ")}
                  </InfoValue>
                  {ocorrencia.localizacao.pontoReferencia && (
                    <InfoValue style={{ fontStyle: "italic", color: "#64748b" }}>
                      Ref: {ocorrencia.localizacao.pontoReferencia}
                    </InfoValue>
                  )}
                </>
              )}


              {/* Mapa */}
              {region && (
                <View style={{ height: 300, marginTop: 16, borderRadius: 12, overflow: "hidden" }}>
                  <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    region={{
                      latitude: parseFloat(editable.latitude || region.latitude.toString()),
                      longitude: parseFloat(editable.longitude || region.longitude.toString()),
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: parseFloat(editable.latitude || region.latitude.toString()),
                        longitude: parseFloat(editable.longitude || region.longitude.toString()),
                      }}
                      draggable={editMode}
                      onDragEnd={(e) => {
                        const { latitude, longitude } = e.nativeEvent.coordinate;
                        setEditable(prev => ({
                          ...prev,
                          latitude: latitude.toFixed(8),
                          longitude: longitude.toFixed(8),
                        }));
                      }}
                    />
                  </MapView>
                </View>
              )}
            </Card>
          )}

          {/* EQUIPE */}
          <Card>
            <IDSectionTitle>Equipe ({equipe.length})</IDSectionTitle>
            {editMode && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                {usuarios.map(u => {
                  const selecionado = equipe.some(e => e.id === u.id);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setEquipe(prev => selecionado ? prev.filter(e => e.id !== u.id) : [...prev, u])}
                      style={[cadastrarStyles.membroBtn, selecionado && cadastrarStyles.membroSelecionado]}
                    >
                      <Text style={[cadastrarStyles.membroText, selecionado && cadastrarStyles.membroTextSel]}>
                        {u.nome?.split(" ")[0] ?? ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {equipe.map(m => (
              <IDInfoRow key={m.id}>
                <User size={18} color="#64748b" />
                <InfoValue>{m.nome}</InfoValue>
                {editMode && (
                  <TouchableOpacity
                    onPress={() => {
                      const estaRemovendoEleMesmo = usuarioLogado && m.id === usuarioLogado.id;

                      if (estaRemovendoEleMesmo) {
                        Alert.alert(
                          "Atenção! Você está se removendo da equipe",
                          "Ao se remover, você perderá acesso para editar esta ocorrência no futuro se não tiver criado a ocorrência.\n\nTem certeza que deseja continuar?",
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Sim, remover",
                              style: "destructive",
                              onPress: () => setEquipe(prev => prev.filter(e => e.id !== m.id)),
                            },
                          ],
                          { cancelable: true }
                        );
                      } else {
                        setEquipe(prev => prev.filter(e => e.id !== m.id));
                      }
                    }}
                  >
                    <X size={20} color="#dc2625" weight="bold" />
                  </TouchableOpacity>
                )}
              </IDInfoRow>
            ))}
          </Card>

          {/* VIATURA */}
          <Card>
            <IDSectionTitle>Viatura Designada</IDSectionTitle>

            {editMode ? (
              <View style={{ marginTop: 8 }}>
                <Text style={cadastrarStyles.label}>Selecione a Viatura</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => viaturaPickerRef.current?.togglePicker?.()}>
                  <View pointerEvents="none">
                    <RNPickerSelect
                      ref={viaturaPickerRef}
                      onValueChange={(value) => {
                        if (!value || value === "null") {
                          setOcorrencia(prev => prev ? { ...prev, viatura: undefined } : prev);
                          return;
                        }
                        const viaturaSelecionada = viaturas.find(v => v.id === Number(value));
                        if (viaturaSelecionada) {
                          setOcorrencia(prev => prev ? {
                            ...prev,
                            viatura: {
                              id: viaturaSelecionada.id,
                              tipo: viaturaSelecionada.tipo || "",
                              numero: viaturaSelecionada.numero || "",
                              placa: viaturaSelecionada.placa || "",
                            }
                          } : prev);
                        }
                      }}

                      value={ocorrencia?.viatura?.id ? String(ocorrencia.viatura.id) : null}

                      items={[
                        { label: "Nenhuma viatura", value: null },
                        // Garante que mesmo viaturas sem número/placa apareçam
                        ...viaturas.map(v => ({
                          label: `${v.tipo || "??"}-${v.numero || "??"} (${v.placa || "sem placa"})`.trim(),
                          value: String(v.id),
                        }))
                      ]}
                      placeholder={{}}
                      style={pickerStyle}
                      Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                      useNativeAndroidPickerStyle={false}
                    />

                  </View>
                </TouchableOpacity>
              </View>
            ) : ocorrencia?.viatura ? (
              <>
                <Text style={cadastrarStyles.label}>Viatura</Text>
                <InfoValue>
                  {`${ocorrencia.viatura?.tipo ?? ""}-${ocorrencia.viatura?.numero ?? "???"}`}
                  {ocorrencia.viatura?.placa ? ` • ${ocorrencia.viatura.placa}` : ""}
                </InfoValue>
              </>
            ) : (
              <IDEmptyText>Nenhuma viatura designada</IDEmptyText>
            )}

          </Card>

          {/* VÍTIMAS */}
          <Card>
            <IDSectionTitle>Vítimas ({vitimas.length})</IDSectionTitle>

            {vitimas.length === 0 ? (
              <IDEmptyText>Nenhuma vítima registrada</IDEmptyText>
            ) : (
              vitimas.map((v) => (
                <VitimaCard key={v.id}>
                  <VitimaHeader>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <VitimaNome>{v.nome || "Sem nome"}</VitimaNome>
                      {v.sexo === "M" ? (
                        <GenderMale size={26} color="#3B82F6" />
                      ) : v.sexo === "F" ? (
                        <GenderFemale size={26} color="#EC4899" />
                      ) : (
                        <User size={26} color="#8B5CF6" weight="bold" /> // Ícone roxo para "Outro"
                      )}
                    </View>

                    {editMode && (
                      <View style={{ flexDirection: "row", gap: 16 }}>
                        <TouchableOpacity
                          onPress={() => {
                            // Garante que todos os campos, inclusive condicaoNome, sejam preenchidos corretamente
                                                          const rawLesaoId = v.lesaoId;
                                                          // Evita comparar number com string: trate explicitamente os tipos possíveis
                                                          let lesaoIdNum: number | undefined;
                                                          if (rawLesaoId === null || rawLesaoId === undefined) {
                                                            lesaoIdNum = undefined;
                                                          } else if (typeof rawLesaoId === "number") {
                                                            lesaoIdNum = rawLesaoId;
                                                          } else {
                                                            // Qualquer valor inesperado (por exemplo string) é convertido de forma segura
                                                            const s = String(rawLesaoId).trim();
                                                            lesaoIdNum = s !== "" && !isNaN(Number(s)) ? Number(s) : undefined;
                                                          }
                                                          const vitimaCompleta = {
                                                            ...v,
                                                            // Força o tipoAtendimento (às vezes vem como tipo_atendimento)
                                                            tipoAtendimento: v.tipoAtendimento || "",
                                                            // Garante que o condicaoNome venha do lesao, mesmo se estiver em camelCase ou quando lesaoId for string
                                                            condicaoNome: v.condicaoNome || (lesaoIdNum ? condicoesVitima.find(c => Number(c.id) === lesaoIdNum)?.tipoLesao : undefined),
                                                            // Garante que lesaoId esteja presente como number | undefined
                                                            lesaoId: lesaoIdNum,
                                                          };
                            setVitimaEmEdicao(vitimaCompleta);
                            setModalVitimaVisible(true);
                          }}
                        >
                          <PencilSimple size={21} color="#1976d2" weight="bold" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert("Excluir vítima", `Tem certeza que deseja remover ${v.nome || "esta vítima"}?`, [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Excluir",
                                style: "destructive",
                                onPress: async () => {
                                  // Se já existe no banco, deleta de lá
                                  if (typeof v.id === "number") {
                                    try {
                                      await deleteVitima(v.id);
                                    } catch (e) {
                                      console.error("Erro ao deletar vítima do banco", e);
                                    }
                                  }
                                  setVitimas(prev => prev.filter(x => x.id !== v.id));
                                },
                              },
                            ]);
                          }}
                        >
                          <X size={24} color="#dc2625" weight="bold" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </VitimaHeader>

                  <VitimaInfo>
                    {/* CPF */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <IdentificationCard size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: "#475569", fontFamily: "monospace" }}>
                        {formatCPF(v.cpfVitima || '')}
                      </Text>
                    </View>

                    {/* Idade */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Calendar size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: "#475569" }}>{v.idade} anos</Text>
                    </View>

                    {/* Sexo */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <User size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: "#475569" }}>
                        {v.sexo === "M" ? "Masculino" : v.sexo === "F" ? "Feminino" : "Outro"}
                      </Text>
                    </View>

                    {/* Etnia */}
                    {v.etnia && v.etnia !== "outro" && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Palette size={16} color="#64748b" />
                        <Text style={{ fontSize: 14, color: "#475569", textTransform: "capitalize" }}>
                          {v.etnia === "indigena" ? "Indígena" : v.etnia}
                        </Text>
                      </View>
                    )}

                    {/* Tipo de Atendimento */}
                    {v.tipoAtendimento && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <FirstAidKit size={16} color="#64748b" />
                        <Text style={{ fontSize: 14, color: "#475569" }}>{v.tipoAtendimento}</Text>
                      </View>
                    )}

                    {/* Condição da Vítima */}
                    {v.condicaoNome && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Heartbeat size={16} color="#64748b" />
                        <Text style={{ fontSize: 14, color: "#475569" }}>{v.condicaoNome}</Text>
                      </View>
                    )}

                    {/* Destino */}
                    {v.destinoVitima && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Hospital size={16} color="#64748b" />
                        <Text style={{ fontSize: 14, color: "#475569" }}>{v.destinoVitima}</Text>
                      </View>
                    )}

                    {/* Observações */}
                    {v.observacoes && <ObsText>Obs: {v.observacoes}</ObsText>}
                  </VitimaInfo>
                </VitimaCard>
              ))
            )}

            {/* Botão Adicionar */}
            {editMode && (
              <TouchableOpacity
                style={[cadastrarStyles.botaoVermelho, { marginTop: 16 }]}
                onPress={() => {
                  setVitimaEmEdicao({
                    id: `temp_${Date.now()}_${Math.random().toFixed(4).slice(2)}`,
                    nome: "",
                    cpfVitima: "",
                    idade: 0,
                    sexo: "",
                    tipoAtendimento: "",
                    observacoes: "",
                    etnia: "",
                    destinoVitima: "",
                  });
                  setModalVitimaVisible(true);
                }}
              >
                <Text style={cadastrarStyles.botaoTexto}>+ Adicionar Vítima</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* ANEXOS - FOTOS E VÍDEOS */}
          <Card>
            <IDSectionTitle>Evidências</IDSectionTitle>

            {/* Lista horizontal de anexos existentes + botão + */}
            <View style={{ position: "relative", marginTop: 12, minHeight: 130 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {/* Anexos já existentes (do backend) */}
                  {imagens.map((img) => (
                    <View key={img.id} style={{ position: "relative" }}>
                      <TouchableOpacity onPress={() => { setSelectedImage(img.urlArquivo); setModalVisible(true); }}>
                        <GalleryImage source={{ uri: img.urlArquivo }} />
                      </TouchableOpacity>

                      {/* Botão de excluir (apenas no editMode) */}
                      {editMode && (
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              "Excluir foto/vídeo",
                              "Tem certeza que deseja remover este anexo?",
                              [
                                { text: "Cancelar", style: "cancel" },
                                {
                                  text: "Excluir",
                                  style: "destructive",
                                  onPress: async () => {
                                    try {
                                      if (img.id) {
                                        await deleteAnexo(img.id);
                                      }
                                      setOcorrencia(prev => prev ? {
                                        ...prev,
                                        anexos: prev.anexos?.filter(a => a.id !== img.id)
                                      } : prev);
                                      Alert.alert("Sucesso", "Anexo removido");
                                    } catch (error) {
                                      Alert.alert("Erro", "Não foi possível remover o anexo");
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            backgroundColor: "#dc2626",
                            borderRadius: 16,
                            padding: 6,
                            zIndex: 10,
                          }}
                        >
                          <X size={16} color="#fff" weight="bold" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* Anexos novos (ainda não enviados) */}
                  {anexosNovos.map((anexo, index) => (
                    <View key={`novo-${index}`} style={{ position: "relative" }}>
                      <TouchableOpacity onPress={() => { setSelectedImage(anexo.uri); setModalVisible(true); }}>
                        <GalleryImage source={{ uri: anexo.uri }} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setAnexosNovos(prev => prev.filter((_, i) => i !== index))}
                        style={{
                          position: "absolute",
                          top: -8,
                          right: -8,
                          backgroundColor: "#dc2626",
                          borderRadius: 16,
                          padding: 6,
                        }}
                      >
                        <X size={16} color="#fff" weight="bold" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Botão + para adicionar (sempre visível) */}
                  <TouchableOpacity
                    onPress={async () => {
                      Alert.alert(
                        "Adicionar mídia",
                        "Escolha a origem:",
                        [
                          {
                            text: "Câmera",
                            onPress: async () => {
                              const { status } = await ImagePicker.requestCameraPermissionsAsync();
                              if (status !== "granted") {
                                Alert.alert("Permissão negada", "Precisamos da câmera para tirar foto/vídeo");
                                return;
                              }

                              const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.All,
                                quality: 0.8,
                                allowsEditing: false,
                              });

                              if (!result.canceled && result.assets?.[0]) {
                                const asset = result.assets[0];
                                setAnexosNovos(prev => [...prev, {
                                  uri: asset.uri,
                                  name: asset.fileName || `capture_${Date.now()}`,
                                  type: asset.type || asset.mimeType || "image/jpeg",
                                }]);
                              }
                            },
                          },
                          {
                            text: "Galeria",
                            onPress: async () => {
                              const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.All,
                                quality: 0.8,
                                allowsMultipleSelection: true,
                              });

                              if (!result.canceled && result.assets) {
                                const novos = result.assets.map(asset => ({
                                  uri: asset.uri,
                                  name: asset.fileName || `galeria_${Date.now()}`,
                                  type: asset.type || asset.mimeType || "image/jpeg",
                                }));
                                setAnexosNovos(prev => [...prev, ...novos]);
                              }
                            },
                          },
                          { text: "Cancelar", style: "cancel" },
                        ]
                      );
                    }}
                    style={{
                      width: 100,
                      height: 100,
                      backgroundColor: "#f3f4f6",
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: "#dc2626",
                      borderStyle: "dashed",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="add" size={40} color="#dc2626" />
                    <Text style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Mensagem centralizada quando não tem nenhum anexo */}
              {imagens.length === 0 && anexosNovos.length === 0 && !editMode && (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <IDEmptyText>Nenhum anexo registrado</IDEmptyText>
                </View>
              )}
            </View>
          </Card>

          {/* Assinatura */}

          {/* Responsável (mostrado ao final junto com a assinatura) */}
          <Card>
            <IDSectionTitle>Responsável</IDSectionTitle>
            {ocorrencia.usuario ? (
              <IDInfoRow>
                <User size={20} color="#64748b" />
                <View style={{ flex: 1 }}>
                  <InfoValue>{ocorrencia.usuario.nome}</InfoValue>
                  {ocorrencia.usuario.patente && <InfoSubvalue>{ocorrencia.usuario.patente}</InfoSubvalue>}
                </View>
              </IDInfoRow>
            ) : (
              <IDEmptyText>Responsável não informado</IDEmptyText>
            )}

            {ocorrencia.unidadeOperacional ? (
              <IDInfoRow>
                <Building size={20} color="#64748b" />
                <View style={{ flex: 1 }}>
                  <InfoValue>{ocorrencia.unidadeOperacional.sigla}</InfoValue>
                  <InfoSubvalue>{ocorrencia.unidadeOperacional.nome}</InfoSubvalue>
                </View>
              </IDInfoRow>
            ) : null}
            {assinatura && (
              <>
                <AssinaturaBox>
                  <AssinaturaImg source={{ uri: assinatura.urlArquivo }} resizeMode="contain" />
                </AssinaturaBox>
              </>
            )}
          </Card>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <ModalBackdrop>
          <ModalCloseButton onPress={() => setModalVisible(false)}>
            <X size={32} color="#fff" weight="bold" />
          </ModalCloseButton>
          {selectedImage && <ModalImage source={{ uri: selectedImage }} resizeMode="contain" />}
        </ModalBackdrop>
      </Modal>

      {/* Modal de busca de coordenadas – fundo escuro semitransparente */}
      <Modal
        visible={buscandoCoords}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => { }}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: dark ? '#1f2937' : '#ffffff',
            padding: 28,
            borderRadius: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 20,
            minWidth: 200,
          }}>
            <ActivityIndicator size="large" color="#dc2626" />
            <Text style={{
              marginTop: 16,
              fontSize: 17,
              fontWeight: '600',
              color: dark ? '#f3f4f6' : '#111827',
            }}>
              Buscando coordenadas...
            </Text>
            <Text style={{
              marginTop: 8,
              fontSize: 14,
              color: dark ? '#9ca3af' : '#6b7280',
              textAlign: 'center',
            }}>
              Aguarde um momento
            </Text>
          </View>
        </View>
      </Modal>

      {/* Modal de Edição/Adição de Vítima */}
      <Modal
        visible={modalVitimaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVitimaVisible(false);
          setVitimaEmEdicao(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          {/* O KeyboardAvoidingView vem AQUI FORA, envolvendo tudo */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.select({
              ios: 0,
              android: 20,
            })}
          >
            {/* Esse TouchableOpacity fecha o modal ao clicar fora */}
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                setModalVitimaVisible(false);
                setVitimaEmEdicao(null);
              }}
            />
            {/* O card do modal - agora com flex: 0 e altura automática */}
            <View
              style={{
                backgroundColor: dark ? '#1f2937' : '#ffffff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 40, // espaço pro botão home do iPhone
                maxHeight: '90%',
              }}
            >
              {/* Cabeçalho */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: dark ? '#f3f4f6' : '#111827',
                }}>
                  {vitimaEmEdicao && typeof vitimaEmEdicao.id === 'number' ? 'Editar Vítima' : 'Nova Vítima'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVitimaVisible(false);
                    setVitimaEmEdicao(null);
                  }}
                >
                  <X size={28} color="#dc2626" weight="bold" />
                </TouchableOpacity>
              </View>

              {/* Conteúdo com ScrollView */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >

                <Text style={cadastrarStyles.label}>Nome Completo *</Text>
                <TextInput
                  style={cadastrarStyles.input}
                  value={vitimaEmEdicao?.nome || ""}
                  onChangeText={(t) => setVitimaEmEdicao(prev => prev ? { ...prev, nome: t } : null)}
                  placeholder="Nome completo da vítima"
                  placeholderTextColor="#666"
                />
                <Text style={cadastrarStyles.label}>CPF</Text>
                <TextInput
                  keyboardType="numeric"
                  style={cadastrarStyles.input}
                  value={vitimaEmEdicao?.cpfVitima || ""}
                  onChangeText={(t) => {
                    const numeros = t.replace(/\D/g, "").slice(0, 11);
                    const formatado = numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                    setVitimaEmEdicao(prev => prev ? { ...prev, cpfVitima: numeros ? formatado : "" } : null);
                  }}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#666"
                  maxLength={14} // opcional: tamanho da string formatada (ex.: 14 = 000.000.000-00)
                />
                <Text style={cadastrarStyles.label}>Idade</Text>
                <TextInput
                  style={cadastrarStyles.input}
                  value={vitimaEmEdicao?.idade ? String(vitimaEmEdicao.idade) : ""}
                  onChangeText={(t) => setVitimaEmEdicao(prev => prev ? { ...prev, idade: parseInt(t) || 0 } : null)}
                  keyboardType="numeric"
                  placeholder="Ex: 35"
                  placeholderTextColor="#666"
                />
                <Text style={cadastrarStyles.label}>Sexo</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => sexoPickerRef.current?.togglePicker?.()}>
                  <View pointerEvents="none">
                    <RNPickerSelect
                      ref={sexoPickerRef}
                      value={vitimaEmEdicao?.sexo}
                      onValueChange={(v) => setVitimaEmEdicao(prev => prev ? { ...prev, sexo: v } : null)}
                      items={[
                        { label: "Masculino", value: "M" },
                        { label: "Feminino", value: "F" },
                        { label: "Outro", value: "O" },
                      ]}
                      style={pickerStyle}
                      placeholder={{ label: "Selecione o sexo", value: "" }}
                      Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                      useNativeAndroidPickerStyle={false}
                    />
                  </View>
                </TouchableOpacity>
                <Text style={cadastrarStyles.label}>Etnia</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => etniaPickerRef.current?.togglePicker?.()}>
                  <View pointerEvents="none">
                    <RNPickerSelect
                      ref={etniaPickerRef}
                      value={vitimaEmEdicao?.etnia || ""}
                      onValueChange={(v) => setVitimaEmEdicao(prev => prev ? { ...prev, etnia: v } : null)}
                      items={[
                        { label: "Branca", value: "branca" },
                        { label: "Preta", value: "preta" },
                        { label: "Parda", value: "parda" },
                        { label: "Amarela", value: "amarela" },
                        { label: "Indígena", value: "indigena" },
                        { label: "Outro", value: "outro" },
                      ]}
                      style={pickerStyle}
                      placeholder={{ label: "Selecione a etnia", value: "" }}
                      Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2626" />}
                    />
                  </View>
                </TouchableOpacity>

                <Text style={cadastrarStyles.label}>Condição da Vítima</Text>
                {loadingCondicoes ? <ActivityIndicator color="#dc2625" /> : (
                  <TouchableOpacity activeOpacity={0.7} onPress={() => condicaoPickerRef.current?.togglePicker?.()}>
                    <View pointerEvents="none">
                      <RNPickerSelect
                        ref={condicaoPickerRef}
                        value={vitimaEmEdicao?.lesaoId || null}
                        onValueChange={(v) => {
                          const lesaoSelecionada = condicoesVitima.find(c => c.id === v);
                          setVitimaEmEdicao(prev => prev ? {
                            ...prev,
                            lesaoId: v || undefined,
                            condicaoNome: lesaoSelecionada ? lesaoSelecionada.tipoLesao : undefined
                          } : null);
                        }} items={condicoesVitima.map(c => ({ label: c.tipoLesao, value: c.id }))}
                        style={pickerStyle}
                        placeholder={{ label: "Selecione a condição", value: null }}
                        Icon={() => <Ionicons name="chevron-down" size={24} color="#dc2625" style={{ marginRight: 10 }} />}
                      />
                    </View>
                  </TouchableOpacity>
                )}

                <Text style={cadastrarStyles.label}>Destino da Vítima</Text>
                <TextInput
                  style={cadastrarStyles.input}
                  value={vitimaEmEdicao?.destinoVitima || ""}
                  onChangeText={(t) => setVitimaEmEdicao(prev => prev ? { ...prev, destinoVitima: t } : null)}
                  placeholder="Ex: Hospital Municipal"
                  placeholderTextColor="#666"
                />
                <Text style={cadastrarStyles.label}>Tipo de Atendimento</Text>
                <TextInput
                  style={cadastrarStyles.input}
                  value={vitimaEmEdicao?.tipoAtendimento || ""}
                  onChangeText={(t) => setVitimaEmEdicao(prev => prev ? { ...prev, tipoAtendimento: t } : null)}
                  placeholder="Ex: Remoção, Atendimento no local, etc."
                  placeholderTextColor="#666"
                />
                <Text style={cadastrarStyles.label}>Observações</Text>
                <TextInput
                  style={[cadastrarStyles.textArea, { height: 100 }]}
                  value={vitimaEmEdicao?.observacoes || ""}
                  onChangeText={(t) => setVitimaEmEdicao(prev => prev ? { ...prev, observacoes: t } : null)}
                  multiline
                  placeholder="Estado da vítima, lesões, etc."
                  placeholderTextColor="#666"
                />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
                  <TouchableOpacity
                    style={[cadastrarStyles.botaoVermelho, { flex: 1 }]}
                    onPress={() => {
                      if (!vitimaEmEdicao?.nome?.trim() || !vitimaEmEdicao?.lesaoId) {
                        Alert.alert("Erro", "O nome da vítima e sua condição são obrigatórios");
                        return;
                      }
                      setVitimas(prev => {
                        const existe = prev.some(x => x.id === vitimaEmEdicao.id);
                        if (existe) {
                          return prev.map(x => x.id === vitimaEmEdicao.id ? vitimaEmEdicao : x);
                        } else {
                          return [...prev, { ...vitimaEmEdicao, id: `temp_${Date.now()}_${Math.random().toFixed(4).slice(2)}` }];
                        }
                      });
                      setModalVitimaVisible(false);
                      setVitimaEmEdicao(null);
                    }}
                  >
                    <Text style={cadastrarStyles.botaoTexto}>Salvar Vítima</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[cadastrarStyles.botaoVermelho, { backgroundColor: '#6b7280', flex: 1 }]}
                    onPress={() => {
                      setModalVitimaVisible(false);
                      setVitimaEmEdicao(null);
                    }}
                  >
                    <Text style={cadastrarStyles.botaoTexto}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Container>
  );
}
