/* eslint-disable react-hooks/rules-of-hooks */
// app/(tabs)/perfil.tsx
import { fetchUsuario } from "@/services/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Buildings,
  Camera,
  CheckCircle,
  Envelope,
  IdentificationCard,
  ShieldCheck,
  User,
  XCircle,
} from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme as useStyledTheme } from "styled-components/native";
import { useUsuarioLogado } from "../../hooks/useUsuarioLogado";
import {
  Card,
  Container,
  IDHeader,
  IDHeaderTitle,
  IDInfoRow,
  InfoLabel,
  InfoValue,
} from "../../styles/styles";
import { useTheme } from "../theme";

type PerfilUsuario = {
  id: number;
  nome: string;
  matricula: string;
  email: string;
  perfil: { id: number; nome: string };
  unidadeOperacional: { id: number; nome: string };
  status: boolean;
  ultimoAcesso: string;
};

export default function PerfilScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const styledTheme: any = useStyledTheme();
  const { dark } = useTheme();

  // Usuário logado (para fallback quando não tem ?id=)
  const { id: usuarioLogadoId } = useUsuarioLogado();

  const [usuario, setUsuario] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Determina qual ID usar: o da URL ou o do usuário logado
  const usuarioIdParaBuscar = idParam ? Number(idParam) : usuarioLogadoId;

  // Se ainda não tem ID (carregando usuário), mostra loading
  if (!usuarioLogadoId && !idParam) {
    return (
      <Container>
        <ActivityIndicator size="large" color={styledTheme.danger} />
        <Text style={{ textAlign: "center", marginTop: 16, color: styledTheme.textSecondary }}>
          Carregando perfil...
        </Text>
      </Container>
    );
  }

  useEffect(() => {
    const carregarPerfil = async (id: number) => {
      try {
        setLoading(true);
        const res = await fetchUsuario(id);

        if (!res) {
          setUsuario(null);
          return;
        }

        const perfil: PerfilUsuario = {
          id: res.id,
          nome: res.nome || "Sem nome",
          matricula: res.matricula || "Não informada",
          email: res.email || "Não informado",
          perfil: res.perfil ?? { id: 0, nome: "Não definido" },
          unidadeOperacional: res.unidadeOperacional ?? { id: 0, nome: "Não definida" },
          status: Boolean(res.status),
          ultimoAcesso: res.ultimoAcesso || "Nunca acessou",
        };

        setUsuario(perfil);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    };

    if (usuarioIdParaBuscar != null) {
      carregarPerfil(usuarioIdParaBuscar);
    }
  }, [usuarioIdParaBuscar]);

  // Loading
  if (loading) {
    return (
      <Container>
        <ActivityIndicator size="large" color={styledTheme.danger} />
        <Text style={{ textAlign: "center", marginTop: 16, color: styledTheme.textSecondary }}>
          Carregando perfil...
        </Text>
      </Container>
    );
  }

  // Usuário não encontrado
  if (!usuario) {
    return (
      <Container>
        <Text style={{ textAlign: "center", marginTop: 50, fontSize: 18, color: styledTheme.muted }}>
          Usuário não encontrado
        </Text>
      </Container>
    );
  }

  const isMeuPerfil = usuario.id === usuarioLogadoId;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: styledTheme.background }}>
      <IDHeader>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={28} color={styledTheme.textPrimary} />
        </TouchableOpacity>
        <IDHeaderTitle>{isMeuPerfil ? "Meu Perfil" : "Perfil do Usuário"}</IDHeaderTitle>
        <View style={{ width: 28 }} />
      </IDHeader>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Foto + Nome */}
        <View style={{ alignItems: "center", marginVertical: 24 }}>
          <View style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: styledTheme.border,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            borderWidth: 4,
            borderColor: styledTheme.surface,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 8,
          }}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.nome)}&background=dc2625&color=fff&bold=true&size=256`
              }}
              style={{ width: 132, height: 132, borderRadius: 66 }}
            />
            {isMeuPerfil && (
              <TouchableOpacity style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: styledTheme.danger,
                padding: 10,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: styledTheme.surface,
              }}>
                <Camera size={20} color="#fff" weight="fill" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={{ fontSize: 26, fontWeight: "800", color: styledTheme.textPrimary, marginTop: 16, textAlign: "center" }}>
            {usuario.nome}
          </Text>
          <Text style={{ fontSize: 16, color: styledTheme.textSecondary, marginTop: 4 }}>
            {usuario.matricula}
          </Text>
        </View>

        {/* Status */}
        <Card style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {usuario.status ? (
              <>
                <CheckCircle size={28} weight="fill" color={styledTheme.success} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: styledTheme.success }}>Ativo</Text>
              </>
            ) : (
              <>
                <XCircle size={28} weight="fill" color={styledTheme.danger} />
                <Text style={{ fontSize: 18, fontWeight: "700", color: styledTheme.danger }}>Inativo</Text>
              </>
            )}
          </View>
        </Card>

        {/* Informações */}
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: styledTheme.textPrimary, marginBottom: 16 }}>
            Informações Pessoais
          </Text>

          <IDInfoRow>
            <IdentificationCard size={22} color={styledTheme.textSecondary} />
            <View style={{ flex: 1 }}>
              <InfoLabel>Matrícula</InfoLabel>
              <InfoValue>{usuario.matricula}</InfoValue>
            </View>
          </IDInfoRow>

          <IDInfoRow>
            <Envelope size={22} color={styledTheme.textSecondary} />
            <View style={{ flex: 1 }}>
              <InfoLabel>E-mail</InfoLabel>
              <InfoValue>{usuario.email}</InfoValue>
            </View>
          </IDInfoRow>

          <IDInfoRow>
            <ShieldCheck size={22} color={styledTheme.textSecondary} />
            <View style={{ flex: 1 }}>
              <InfoLabel>Perfil de Acesso</InfoLabel>
              <InfoValue>{usuario.perfil.nome}</InfoValue>
            </View>
          </IDInfoRow>

          <IDInfoRow>
            <Buildings size={22} color={styledTheme.textSecondary} />
            <View style={{ flex: 1 }}>
              <InfoLabel>Unidade Operacional</InfoLabel>
              <InfoValue>{usuario.unidadeOperacional.nome}</InfoValue>
            </View>
          </IDInfoRow>

          <IDInfoRow>
            <User size={22} color={styledTheme.textSecondary} />
            <View style={{ flex: 1 }}>
              <InfoLabel>Último Acesso</InfoLabel>
              <InfoValue>
                {usuario.ultimoAcesso === "Nunca acessou" ? "Nunca acessou" : new Date(usuario.ultimoAcesso).toLocaleString("pt-BR")}
              </InfoValue>
            </View>
          </IDInfoRow>
        </Card>

        {/* Botão Editar (só aparece no próprio perfil) */}
        {isMeuPerfil && (
          <TouchableOpacity style={{
            marginHorizontal: 16,
            marginTop: 24,
            marginBottom: 40,
            backgroundColor: styledTheme.danger,
            padding: 16,
            borderRadius: 16,
            alignItems: "center",
          }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              Editar Perfil
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}