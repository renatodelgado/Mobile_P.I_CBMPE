// app/configuracoes.tsx
import { useRouter } from "expo-router";
import { ArrowLeft, Bell, Info, SignOut } from "phosphor-react-native";
import React from "react";
import { Alert, StatusBar, Switch, TouchableOpacity, View } from "react-native";
import { useTheme as useStyledTheme } from "styled-components/native";
import { useTheme } from "../app/theme";
import { useAuthStore } from "../store/authStore";
import { ConfigContainer, ConfigHeaderRow, ConfigTitle, LabelText, Row, RowLeft, SectionLabel, VersionText } from "../styles/styles";

export default function Configuracoes() {
  const router = useRouter();
  const styledTheme: any = useStyledTheme();
  const { dark, toggle } = useTheme();
  const { logout } = useAuthStore();
  const [notificacoes, setNotificacoes] = React.useState(true);

  const openSobre = () => {
    console.log('[configuracoes] abrir sobre');
    try {
      router.push('/sobre');
    } catch (err) {
      console.warn('[configuracoes] erro ao navegar para sobre', err);
    }
  };

  const handleLogout = () => {
  Alert.alert(
    "Sair da conta",
    "Tem certeza que deseja sair?",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: () => {
          logout(); // limpa o store e AsyncStorage
          // Não precisa de setTimeout nem nada!
          router.replace("/login");
        },
      },
    ]
  );
};

  return (
    <ConfigContainer>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={styledTheme.surface} />

      <ConfigHeaderRow>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={28} color={styledTheme.textPrimary} />
        </TouchableOpacity>
        <ConfigTitle>Configurações</ConfigTitle>
        <View style={{ width: 28 }} />
      </ConfigHeaderRow>

      <SectionLabel>Preferências</SectionLabel>

      <Row onPress={() => setNotificacoes(!notificacoes)}>
        <RowLeft>
          <Bell size={22} color={styledTheme.textSecondary} />
          <LabelText>Notificações</LabelText>
        </RowLeft>
        <Switch value={notificacoes} onValueChange={setNotificacoes} />
      </Row>

      {/* <Row onPress={toggle}>
        <RowLeft>
          <Moon size={22} color={styledTheme.textSecondary} />
          <LabelText>Tema escuro</LabelText>
        </RowLeft>
        <Switch value={dark} onValueChange={toggle} />
      </Row> */}

      <SectionLabel>Informações</SectionLabel>

      <Row onPress={() => Alert.alert("Em breve", "Em desenvolvimento")}>
        <RowLeft>
          <Info size={22} color={styledTheme.textSecondary} />
          <LabelText>Manual de uso</LabelText>
        </RowLeft>
      </Row>

      <Row onPress={openSobre}>
        <RowLeft>
          <Info size={22} color={styledTheme.textSecondary} />
          <LabelText>Sobre o sistema</LabelText>
        </RowLeft>
      </Row>

      <Row onPress={handleLogout}>
        <RowLeft>
          <SignOut size={22} color={styledTheme.danger} weight="bold" />
          <LabelText danger>Sair da conta</LabelText>
        </RowLeft>
      </Row>

      <VersionText>Versão 1.0.0</VersionText>
    </ConfigContainer>
  );
}