// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initAuthToken } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { ThemeProvider } from "./theme";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading } = useAuthStore();
  const init = useAuthStore((s) => s.init);
  const hasInitialized = useRef(false);

  // 1. Inicialização única
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const bootstrap = async () => {
      await initAuthToken();
      await init();
    };
    bootstrap();
  }, [init]);

  // 2. Redirecionamento SEM early return dentro do effect
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "configuracoes" || segments[0] === "ocorrencia";
    const inLogin = segments[0] === "login" || (segments as readonly string[]).length === 0;

    if (token && !inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!token && !inLogin) {
      router.replace("/login");
    }
  }, [token, isLoading, segments, router]);

  // Early return seguro (todos os hooks já foram chamados)
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
            <ActivityIndicator size="large" color="#dc2625" />
          </View>
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="configuracoes" />
          <Stack.Screen name="ocorrencia/[id]" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}