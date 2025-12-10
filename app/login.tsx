// app/login.tsx (ou onde estiver seu login)
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";

import { useRouter } from "expo-router";
import {
  Button,
  ButtonText,
  Card,
  CheckboxBox,
  CheckMark,
  Container,
  ForgotText,
  IconContainer,
  Input,
  InputWrapper,
  Label,
  Logo,
  RememberButton,
  RememberRow,
  RememberText,
  Subtitle,
  Title,
} from "../styles/Login.styles";

import { useExpoPushToken } from "@/hooks/useExpoPushToken";
import { Clipboard, Lock } from "phosphor-react-native";
import { login, salvarPushToken } from "../services/api";
import { useAuthStore } from "../store/authStore";

export default function LoginScreen() {
  const router = useRouter();

  const expoPushToken = useExpoPushToken();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Erro", "Preencha matrícula e senha");
      return;
    }

    try {
      setLoading(true);

      const response = await login(username.trim(), password);

      // Ajuste conforme sua API retorna
      const token = response?.token || response?.accessToken || response?.data?.token;
      const usuario = response?.usuario || response?.user || response?.data?.usuario;

      if (!token || !usuario) {
        Alert.alert("Falha no login", "Resposta inválida do servidor");
        return;
      }

      // CORRETO: passando os 2 parâmetros que o store espera
      useAuthStore.getState().login(token, usuario);

      // Após o login bem-sucedido, tente salvar o pushToken no backend (best-effort)
      try {
        const uid = usuario?.id ?? usuario?.usuarioId ?? usuario?.userId;
        if (uid && expoPushToken) {
          salvarPushToken(uid, expoPushToken).catch(() => {});
        }
      } catch (e) {
        // não bloquear o fluxo de login
        console.warn('falha ao enviar pushToken após login', e);
      }

      // O redirecionamento acontece automaticamente no _layout.tsx
      // Mas podemos forçar aqui também (opcional)
      router.replace("/(tabs)");

    } catch (err: any) {
      console.error("Erro no login:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Erro ao conectar ao servidor. Verifique sua internet.";
      Alert.alert("Erro no login", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Container>
          <Card>
            {/* Logo */}
            <Logo source={require("../assets/images/logo.png")} />

            <Title>Chama</Title>
            <Subtitle>Sistema de Gestão de Ocorrências CBMPE</Subtitle>

            {/* Matrícula */}
            <Label>Matrícula</Label>
            <InputWrapper>
              <IconContainer>
                <Clipboard size={22} color="#64748b" />
              </IconContainer>
              <Input
                placeholder="Digite sua matrícula"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="default"
              />
            </InputWrapper>

            {/* Senha */}
            <Label>Senha</Label>
            <InputWrapper>
              <IconContainer>
                <Lock size={22} color="#64748b" />
              </IconContainer>
              <Input
                placeholder="Digite sua senha"
                secureTextEntry
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </InputWrapper>

            {/* Lembrar */}
            <RememberRow>
              <RememberButton onPress={() => setRemember(!remember)}>
                <CheckboxBox style={remember ? { backgroundColor: "#dc2625", borderColor: "#dc2625" } : {}}>
                  {remember && <CheckMark>✓</CheckMark>}
                </CheckboxBox>
                <RememberText style={{ marginLeft: 8 }}>Lembrar de mim</RememberText>
              </RememberButton>

              <TouchableOpacity onPress={() => Alert.alert("Em breve", "Funcionalidade em desenvolvimento")}>
                <ForgotText>Esqueci minha senha</ForgotText>
              </TouchableOpacity>
            </RememberRow>

            {/* Botão Entrar */}
            <TouchableOpacity onPress={handleLogin} disabled={loading}>
              <Button>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ButtonText>Entrar</ButtonText>
                )}
              </Button>
            </TouchableOpacity>
          </Card>
        </Container>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}