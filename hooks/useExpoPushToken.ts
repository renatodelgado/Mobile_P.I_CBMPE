// hooks/useExpoPushToken.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";

export function useExpoPushToken() {
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    async function getToken() {
      if (!Device.isDevice) {
        console.log("Push só funciona em dispositivo físico");
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Permissão de notificação negada!");
        return;
      }

      try {
        // Passe explicitamente o projectId para casos em que o manifesto
        // não está disponível/inferível (ex: dev-client / bare workflow).
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: "dfb461ba-9453-474f-b414-8948d6de8002"
        });

        setToken(pushToken.data);
        console.log("Seu Expo Push Token (dev):", pushToken.data);
      } catch (err) {
        console.error("Falha ao obter Expo Push Token:", err);
      }
    }

    getToken();
  }, []);

  return token;
}