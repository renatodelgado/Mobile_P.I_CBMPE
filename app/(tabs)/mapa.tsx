/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
// app/(tabs)/mapa.tsx
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  ArrowClockwise,
  MapPin,
  NavigationArrow,
  Siren,
  User,
} from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useTheme as useStyledTheme } from "styled-components/native";
import { useUsuarioLogado } from "../../hooks/useUsuarioLogado"; // ← IMPORT CORRETO
import { fetchOcorrenciasUsuario } from "../../services/api";

const { width } = Dimensions.get("window");

export default function Mapa() {
  const router = useRouter();
  const styledTheme: any = useStyledTheme();
  const mapRef = useRef<MapView>(null);

  // ← USUÁRIO LOGADO DINÂMICO E SEGURO
  const { id: usuarioLogadoId } = useUsuarioLogado();

  const [loading, setLoading] = useState(true);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Proteção: enquanto o usuário não carrega, mostra loading
  if (!usuarioLogadoId) {
    return (
      <View style={[styles.center, { backgroundColor: styledTheme.surface }]}>
        <ActivityIndicator size="large" color={styledTheme.danger} />
        <Text style={{ marginTop: 16, fontSize: 16, color: styledTheme.textSecondary }}>
          Carregando usuário...
        </Text>
      </View>
    );
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const raw = await fetchOcorrenciasUsuario(usuarioLogadoId);

      const mapped = (raw || [])
        .map((o: any) => {
          const lat = o.localizacao?.latitude ? parseFloat(o.localizacao.latitude) : null;
          const lng = o.localizacao?.longitude ? parseFloat(o.localizacao.longitude) : null;
          const statusRaw = String(o.statusAtendimento || "").toLowerCase().trim();
          const status =
            statusRaw === "pendente" ? "Pendente" :
            statusRaw.includes("andamento") ? "Em andamento" :
            statusRaw === "concluida" || statusRaw === "concluída" ? "Concluída" :
            "Não Atendida";

          return {
            ...o,
            origId: o.id,
            idLabel: o.numeroOcorrencia || `#OCR-${o.id}`,
            latitude: lat,
            longitude: lng,
            status,
            natureza: o.naturezaOcorrencia?.nome || "Não informada",
            descricaoCurta: o.descricao?.length > 90 ? o.descricao.substring(0, 87) + "..." : o.descricao || "Sem descrição",
            timestamp: new Date(o.dataHoraChamada || 0).getTime(),
          };
        })
        ;

      try {
          const sample = mapped.slice(0, 6).map(m => ({ origId: m.origId, localizacao: m.localizacao, latitude: m.latitude, longitude: m.longitude, status: m.status }));
          // suppressed map debug logs
      } catch {
          
      }

      const mappedWithCoords = mapped.filter(o => o.latitude && o.longitude);
      try {
          const sample2 = mappedWithCoords.slice(0, 6).map(m => ({ origId: m.origId, latitude: m.latitude, longitude: m.longitude }));
          // suppressed map debug logs
      } catch {}

      const final = mappedWithCoords;

      setOcorrencias(final);
    } catch (err) {
      console.error("Erro ao carregar mapa:", err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar localização + dados do usuário logado
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogadoId]); // ← recarrega se o usuário mudar (ex: logout/login)

  const filtered = useMemo(() => {
    const list = ocorrencias.filter(o => o.latitude && o.longitude);
    if (showAll) return list;
    return list.filter(o => o.status === "Pendente" || o.status === "Em andamento");
  }, [ocorrencias, showAll]);

  const latestPendente = useMemo(() => {
    return filtered
      .filter(o => o.status === "Pendente")
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }, [filtered]);

  const initialRegion: Region = latestPendente
    ? {
        latitude: latestPendente.latitude,
        longitude: latestPendente.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : { latitude: -8.0476, longitude: -34.8971, latitudeDelta: 0.3, longitudeDelta: 0.3 }; // fallback Recife

  const goToOcorrencia = (ocorrencia: any) => {
    mapRef.current?.animateToRegion({
      latitude: ocorrencia.latitude,
      longitude: ocorrencia.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 800);
  };

  const nextPendente = () => {
    const pendentes = filtered.filter(o => o.status === "Pendente");
    if (pendentes.length === 0) return;
    const next = (currentIndex + 1) % pendentes.length;
    setCurrentIndex(next);
    goToOcorrencia(pendentes[next]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: styledTheme.surface }]}>
        <ActivityIndicator size="large" color={styledTheme.danger} />
        <Text style={{ marginTop: 16, fontSize: 16, color: styledTheme.textSecondary }}>
          Carregando mapa...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: styledTheme.surface }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
      >
        {/* Marcador do usuário */}
        {userLocation && (
          <Marker coordinate={userLocation}>
            <View style={[styles.userMarker, { backgroundColor: styledTheme.danger, borderColor: styledTheme.surface }]}>
              <User size={20} weight="fill" color="#fff" />
            </View>
          </Marker>
        )}

        {/* Marcadores das ocorrências */}
        {filtered.map((o) => {
          const isPendente = o.status === "Pendente";
          return (
            <Marker key={o.origId} coordinate={{ latitude: o.latitude, longitude: o.longitude }}>
              <View style={{ alignItems: "center" }}>
                <View style={[
                  styles.customPin,
                  {
                    backgroundColor: isPendente
                      ? styledTheme.danger
                      : o.status === "Em andamento"
                      ? styledTheme.info
                      : styledTheme.success
                  }
                ]}>
                  <Siren size={20} weight="fill" color="#fff" />
                </View>
              </View>

              <Callout tooltip onPress={() => router.push(`/ocorrencia/${o.origId}`)}>
                <View style={[styles.calloutContainer, { backgroundColor: styledTheme.surface }]}>
                  <View style={styles.calloutHeader}>
                    <Text style={[styles.calloutId, { color: styledTheme.textPrimary }]}>{o.idLabel}</Text>
                    <Text style={[styles.statusBadge, { backgroundColor: isPendente ? "#FECACA" : "#BFDBFE", color: styledTheme.danger }]}>
                      {o.status}
                    </Text>
                  </View>
                  <Text style={[styles.calloutNatureza, { color: styledTheme.textPrimary }]}>{o.natureza}</Text>
                  <Text style={[styles.calloutDesc, { color: styledTheme.textSecondary }]} numberOfLines={2}>
                    {o.descricaoCurta}
                  </Text>
                  <View style={styles.calloutFooter}>
                    <Text style={[styles.verMais, { color: styledTheme.danger }]}>Toque para ver detalhes</Text>
                    <NavigationArrow size={18} color={styledTheme.danger} weight="bold" />
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Controles */}
      <View style={styles.topControls}>
        <View style={[styles.filterContainer, { backgroundColor: styledTheme.surface }]}>
          <TouchableOpacity
            style={[styles.filterBtn, !showAll && styles.activeFilter]}
            onPress={() => setShowAll(false)}
          >
            <Text style={[styles.filterText, !showAll && styles.activeText]}>Abertas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, showAll && styles.activeFilter]}
            onPress={() => setShowAll(true)}
          >
            <Text style={[styles.filterText, showAll && styles.activeText]}>Todas</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.reloadBtn, { backgroundColor: styledTheme.danger }]} onPress={loadData}>
          <ArrowClockwise size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Próxima pendente */}
      {latestPendente && !showAll && (
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: styledTheme.danger }]} onPress={nextPendente}>
          <MapPin size={24} color="#fff" weight="fill" />
          <Text style={styles.nextText}>Próxima pendente</Text>
        </TouchableOpacity>
      )}

      {/* Botão minha localização */}
      {userLocation && (
        <TouchableOpacity
          style={[styles.myLocationBtn, { backgroundColor: styledTheme.surface }]}
          onPress={() =>
            mapRef.current?.animateToRegion(
              {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              },
              800
            )
          }
        >
          <User size={24} color={styledTheme.danger} weight="bold" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// ← estilos exatamente iguais aos seus
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  customPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  userMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    elevation: 6,
  },
  calloutContainer: {
    width: Math.min(300, width * 0.85),
    borderRadius: 16,
    padding: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  calloutHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  calloutId: { fontSize: 15, fontWeight: "800" },
  statusBadge: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  calloutNatureza: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  calloutDesc: { fontSize: 13.5, lineHeight: 19 },
  calloutFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  verMais: { fontSize: 14, fontWeight: "600" },

  topControls: { position: "absolute", top: 50, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  filterContainer: { flexDirection: "row", borderRadius: 12, padding: 6, elevation: 6, shadowOpacity: 0.1, shadowRadius: 10 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  activeFilter: { backgroundColor: "#111827" },
  filterText: { fontWeight: "700", color: "#64748b" },
  activeText: { color: "#fff" },
  reloadBtn: { padding: 12, borderRadius: 12, elevation: 6 },

  nextBtn: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    elevation: 10,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    gap: 10,
  },
  nextText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  myLocationBtn: {
    position: "absolute",
    bottom: 170,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});