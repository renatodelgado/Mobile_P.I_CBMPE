import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ProcessingOverlay from "../components/ProcessingOverlay";
import { initAuthToken, salvarPushToken } from "../services/api";

import { useExpoPushToken } from "@/hooks/useExpoPushToken";
import { useUsuarioLogado } from "@/hooks/useUsuarioLogado";
import { initCache, syncIfOnline } from "../services/cache";
import { useAuthStore } from "../store/authStore";

import { ThemeProvider } from "./theme";

// Registrar handler imediatamente (garante comportamento em foreground no iOS)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading } = useAuthStore();
  const init = useAuthStore((s) => s.init);
  const hasInitialized = useRef(false);
  const expoPushToken = useExpoPushToken();
  const { id } = useUsuarioLogado();

  // 1. Inicialização única
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const bootstrap = async () => {
      await initAuthToken();
      await init();
      // after auth initialized, try to init cache for the current user
      try {
        const user = useAuthStore.getState().user;
        const userId = user?.id ? Number(user.id) : undefined;
        await initCache(userId);
      } catch (err) {
        console.warn('[app] falha ao inicializar cache', err);
      }

      // listen for connectivity changes to sync cache silently
      const netUnsub = NetInfo.addEventListener(state => {
        if (state.isConnected) {
          const user = useAuthStore.getState().user;
          const userId = user?.id ? Number(user.id) : undefined;
          syncIfOnline(userId);
        }
      });

      // cleanup on unmount
      (bootstrap as any)._netUnsub = netUnsub;
    };
    bootstrap();
    return () => {
      try { (bootstrap as any)._netUnsub?.(); } catch {};
    };
  }, [init]);

  // 2. Redirecionamento SEM early return dentro do effect
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "configuracoes" || segments[0] === "ocorrencia" || segments[0] === "sincronizacao" || segments[0] === "sobre";
    const inLogin = segments[0] === "login" || (segments as readonly string[]).length === 0;

    if (token && !inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!token && !inLogin) {
      router.replace("/login");
    }
  }, [token, isLoading, segments, router]);

  // Envia o push token para o backend quando disponível
  useEffect(() => {
    if (!expoPushToken || !id) return;

    const send = async () => {
      try {
        console.log('[app] enviando pushToken do layout ->', { id, expoPushToken });
        await salvarPushToken(id, expoPushToken);
        console.log('Token salvo no backend (via salvarPushToken)');
      } catch (err) {
        console.warn('Erro ao salvar token via salvarPushToken', err);
      }
    };

    send();
  }, [expoPushToken, id]);

  // Configura handler e listeners para debugar notificações (foreground/background)
  useEffect(() => {

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      }).catch(() => {});
    }

    const receivedSub = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] received:', notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[NOTIF] response:', response);
    });

    return () => {
      try { receivedSub.remove(); } catch {}
      try { responseSub.remove(); } catch {}
    };
  }, []);

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
          <Stack.Screen name="sincronizacao" />
          <Stack.Screen name="sobre" />
        </Stack>
        <ProcessingOverlay />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}