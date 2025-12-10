import { Dimensions } from "react-native";
import styledNative from "styled-components/native";

const { width } = Dimensions.get("window");

export const Container = styledNative.SafeAreaView`
  flex: 1;
  padding: 16px;
  background-color: ${(props: any) => props.theme.background};
`;

export const Header = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background-color: ${(props: any) => props.theme.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.theme.border};
`;

export const Greeting = styledNative.Text`
  font-size: 24px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const Subtitle = styledNative.Text`
  font-size: 14px;
  color: ${(props: any) => props.theme.textSecondary};
  margin-top: 4px;
`;

export const LoaderContainer = styledNative.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 16px;
`;

export const Scroll = styledNative.ScrollView.attrs({
    contentContainerStyle: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
})``;

export const StyledStatCard = styledNative.TouchableOpacity<{ bg?: string }>`
  width: ${(width - 48) / 2}px;
  padding: 16px;
  background-color: ${(props: any) => props.bg || props.theme.surface};
  border-radius: 16px;
  margin-bottom: 12px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
`;

export const StyledStatCardTotal = styledNative.TouchableOpacity<{ bg?: string }>`
  width: ${width - 32}px;
  padding: 16px;
  background-color: ${(props: any) => props.bg || props.theme.surface};
  border-radius: 16px;
  margin-bottom: 12px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
`;

// Slim variant used as a thin bar above the other stat cards
export const SlimStatBar = styledNative.TouchableOpacity<{ bg?: string }>`
  width: ${width - 32}px;
  padding-vertical: 8px;
  padding-horizontal: 14px;
  background-color: ${(props: any) => props.bg || props.theme.surface};
  border-radius: 12px;
  margin-bottom: 10px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 6px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

export const StatsGrid = styledNative.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const StatCard = styledNative.TouchableOpacity<{ bg?: string }>`
  width: ${Math.round((width - 48) / 2)}px;
  padding: 16px;
  border-radius: 16px;
  margin-bottom: 12px;
  elevation: 2;
  shadow-color: #000;
  shadow-opacity: 0.05;
  shadow-radius: 8px;
  background-color: ${(props: any) => props.bg || props.theme.surface};
`;

export const StatIcon = styledNative.View`
  margin-bottom: 8px;
`;

export const StatValue = styledNative.Text`
  font-size: 32px;
  font-weight: 800;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const StatLabel = styledNative.Text`
  font-size: 14px;
  color: ${(props: any) => props.theme.textSecondary};
`;

export const Section = styledNative.View``;

export const SectionHeader = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

export const SectionTitle = styledNative.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const VerTodas = styledNative.Text`
  font-size: 15px;
  color: ${(props: any) => props.theme.danger};
  font-weight: 600;
`;

export const OcorrenciaCard = styledNative.TouchableOpacity`
  background-color: ${(props: any) => props.theme.surface};
  border-radius: 14px;
  padding: 16px;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.06;
`;

export const OcorrenciaHeader = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const OcorrenciaId = styledNative.Text`
  font-size: 17px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const OcorrenciaInfo = styledNative.View`
  margin-vertical: 4px;
`;

export const InfoRow = styledNative.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

export const InfoText = styledNative.Text`
  font-size: 14px;
  color: ${(props: any) => props.theme.textSecondary};
  flex: 1;
`;

export const OcorrenciaFooter = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top-width: 1px;
  border-top-color: ${(props: any) => props.theme.background};
`;

export const DateContainer = styledNative.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

export const DateText = styledNative.Text`
  font-size: 12px;
  color: ${(props: any) => props.theme.muted};
`;

export const StatusText = styledNative.Text`
  font-size: 13px;
  font-weight: 600;
`;

export const EmptyText = styledNative.Text`
  text-align: center;
  color: ${(props: any) => props.theme.muted};
  font-size: 16px;
  margin-top: 40px;
`;

// Additional exports used by ocorrencias.tsx
export const Title = styledNative.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const IDContainer = styledNative.SafeAreaView`
  flex: 1;
  background-color: ${(props: any) => props.theme.background};
`;

export const IDHeader = styledNative.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: ${(props: any) => props.theme.surface};
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.theme.border};
`;

export const IDHeaderTitle = styledNative.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const Card = styledNative.View`
  background-color: ${(props: any) => props.theme.surface};
  margin-horizontal: 16px;
  margin-vertical: 8px;
  border-radius: 16px;
  padding: 16px;
  elevation: 3;
  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 10px;
  shadow-offset: 0px 2px;
`;

export const NumeroOcorrencia = styledNative.Text`
  font-size: 26px;
  font-weight: 900;
  color: ${(props: any) => props.theme.danger};
  text-align: center;
`;

export const StatusCard = styledNative.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-horizontal: 16px;
  margin-vertical: 12px;
  padding: 14px;
  border-radius: 16px;
`;

export const StatusLabel = styledNative.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const IDSectionTitle = styledNative.Text`
  font-size: 18px;
  font-weight: 700;
  color: ${(props: any) => props.theme.textPrimary};
  margin-bottom: 12px;
`;

export const IDInfoRow = styledNative.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  margin-vertical: 8px;
`;

export const InfoLabel = styledNative.Text`
  font-size: 13px;
  color: ${(props: any) => props.theme.textSecondary};
`;

export const InfoValue = styledNative.Text`
  font-size: 16px;
  color: ${(props: any) => props.theme.textPrimary};
  font-weight: 500;
`;

export const InfoSubvalue = styledNative.Text`
  font-size: 14px;
  color: ${(props: any) => props.theme.textSecondary};
  margin-top: 2px;
`;

// Classificação da Ocorrência
export const ClassificacaoRow = styledNative.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-vertical: 8px;
`;

export const ClassificacaoLabel = styledNative.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const ClassificacaoTitulo = styledNative.Text`
  font-size: 15px;
  font-weight: 600;
  color: ${(props: any) => props.theme.textPrimary};
`;

export const ClassificacaoChip = styledNative.View`
  padding-horizontal: 14px;
  padding-vertical: 10px;
  border-radius: 20px;
  background-color: #fee2e2;
`;

export const ClassificacaoTexto = styledNative.Text`
  font-size: 15px;
  font-weight: 600;
  color: #991b1b;
`;

// Mapa
export const MapWrapper = styledNative.View`
  margin-top: 12px;
  height: 300px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
`;

export const OpenMapsButton = styledNative.TouchableOpacity`
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 12px;
  border-radius: 12px;
  align-items: center;
`;

export const OpenMapsText = styledNative.Text`
  color: #fff;
  font-weight: 600;
  font-size: 15px;
`;

export const WarningText = styledNative.Text`
  text-align: center;
  color: #f59e0b;
  font-style: italic;
  margin-top: 12px;
`;

// Vítimas
export const VitimaCard = styledNative.View`
  background-color: #f8fafc;
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 12px;
`;

export const VitimaHeader = styledNative.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const VitimaNome = styledNative.Text`
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
`;

export const VitimaInfo = styledNative.View`
  gap: 4px;
`;

export const ObsText = styledNative.Text`
  font-size: 13px;
  color: #dc2625;
  font-style: italic;
  margin-top: 6px;
`;

// Galeria
export const Gallery = styledNative.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
`;

export const GalleryImage = styledNative.Image`
  width: 110px;
  height: 110px;
  border-radius: 12px;
`;

// Assinatura
export const AssinaturaBox = styledNative.View`
  align-items: center;
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 12px;
  border-width: 1px;
  border-color: #e5e7eb;
  border-style: dashed;
`;

export const AssinaturaImg = styledNative.Image`
  width: 240px;
  height: 100px;
`;

// Empty state
export const IDEmptyText = styledNative.Text`
  text-align: center;
  color: #94a3b8;
  font-size: 15px;
  margin-top: 20px;
`;

// Modal
export const ModalBackdrop = styledNative.View`
  flex: 1;
  background-color: #000;
  justify-content: center;
  align-items: center;
`;

export const ModalCloseButton = styledNative.Pressable`
  position: absolute;
  top: 50px;
  right: 20px;
  z-index: 10;
`;

export const ModalImage = styledNative.Image`
  width: 100%;
  height: 80%;
`;

// Marcador customizado no mapa (usado como filho do Marker)
export const CustomMarker = styledNative.View`
  background-color: #dc2625;
  padding: 6px;
  border-radius: 20px;
  border-width: 3px;
  border-color: #fff;
`;

export const MarkerPin = styledNative.View`
  width: 12px;
  height: 12px;
  background-color: #fff;
  border-radius: 6px;
`;

// Configurações screen styled components
export const ConfigContainer = styledNative.SafeAreaView<{ dark?: boolean }>`
  flex: 1;
  background-color: ${(props: { dark?: boolean }) => (props.dark ? "#0f172a" : "#fff")};
  padding-top: 50px;
`;

export const ConfigHeaderRow = styledNative.View`
  flex-direction: row;
  align-items: center;
  padding-horizontal: 16px;
  margin-bottom: 20px;
`;

export const ConfigTitle = styledNative.Text<{ dark?: boolean }>`
  font-size: 22px;
  font-weight: 700;
  margin-left: 12px;
  color: ${(props: { dark?: boolean }) => (props.dark ? "#f8fafc" : "#1e293b")};
`;

export const SectionLabel = styledNative.Text<{ dark?: boolean }>`
  margin-left: 16px;
  margin-bottom: 6px;
  color: ${(props: { dark?: boolean }) => (props.dark ? "#cbd5e1" : "#475569")};
  font-weight: 600;
`;

export const Row = styledNative.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: 14px;
  padding-horizontal: 16px;
  border-bottom-width: 1px;
  border-color: #e2e8f0;
`;

export const RowLeft = styledNative.View`
  flex-direction: row;
  align-items: center;
`;

export const LabelText = styledNative.Text<{ danger?: boolean; dark?: boolean }>`
  margin-left: 10px;
  font-size: 16px;
  color: ${(props: { danger?: boolean; dark?: boolean }) =>
    props.danger ? "#dc2626" : props.dark ? "#f1f5f9" : "#1e293b"};
`;

export const VersionText = styledNative.Text<{ dark?: boolean }>`
  text-align: center;
  margin-top: 50px;
  color: ${(props: { dark?: boolean }) => (props.dark ? "#94a3b8" : "#94a3b8")};
`;
// Styles used by `cadastrar.tsx` as a plain StyleSheet-like object
export const cadastrarStyles: { [key: string]: any } = {
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#666" },
  header: { backgroundColor: "#dc2625", padding: 20 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flex: 1 },
  botaoLimparHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  botaoLimparTexto: { color: "#fff", fontWeight: "600", fontSize: 15 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  headerSubtitle: { color: "#fff", marginTop: 8, opacity: 0.9 },
  progressBar: { flexDirection: "row", marginTop: 12 },
  progressSegment: { flex: 1, height: 5, backgroundColor: "#ffffff50", marginHorizontal: 2, borderRadius: 3 },
  progressActive: { backgroundColor: "#fff" },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6 },
  label: { fontSize: 16, fontWeight: "bold", color: "#333", marginTop: 20, marginBottom: 8 },
  numeroOcorrencia: { fontSize: 20, fontWeight: "bold", color: "#dc2625", marginBottom: 16 },
  input: { placeholderTextColor: "#dc2625", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14, backgroundColor: "#fafafa", fontSize: 16, color: "#333", marginBottom: 12 },
  inputText: { fontSize: 16, color: "#333" },
  textArea: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 14, backgroundColor: "#fafafa", fontSize: 16, color: "#333", height: 120, textAlignVertical: "top" },
  pickerWrapper: { marginBottom: 12 },
  equipeGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  membroBtn: { backgroundColor: "#e0e0e0", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, margin: 6 },
  membroSelecionado: { backgroundColor: "#dc2625" },
  membroText: { color: "#000", fontWeight: "600" },
  membroTextSel: { color: "#fff" },
  fotoThumb: { width: 100, height: 100, borderRadius: 10, margin: 6 },
  botaoVermelho: { backgroundColor: "#dc2625", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 },
  botaoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  botaoSecundario: { borderColor: "#dc2625", borderWidth: 1, padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 },
  botaoSecundarioTexto: { color: "#dc2625", fontWeight: "bold", fontSize: 16 },
  botaoLimpar: { borderColor: "#666", borderWidth: 1, padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 },
  footer: { flexDirection: "row", padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ddd" },
  resumoTitulo: { fontSize: 22, fontWeight: "bold", color: "#dc2625", marginBottom: 20, textAlign: "center" },
  resumoLinha: { fontSize: 16, marginBottom: 10, color: "#444" },
  resumoValor: { fontWeight: "bold", color: "#dc2625" },
  videoThumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: "#333", justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#dc2625", marginBottom: 20, textAlign: "center" },
  vitimaCard: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: "#eee", elevation: 2 },
};