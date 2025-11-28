// store/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setAuthToken } from "../services/api";

type AuthState = {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  init: () => Promise<void>;
  login: (token: string, user: any) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: true,

      init: async () => {
        try {
          const [storedToken, storedUserJson] = await Promise.all([
            AsyncStorage.getItem("token"),
            AsyncStorage.getItem("user"),
          ]);

          if (storedToken) {
            setAuthToken(storedToken);     // ← sincroniza api.ts
          }

          if (storedToken && storedUserJson) {
            set({
              token: storedToken,
              user: JSON.parse(storedUserJson),
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error("Erro ao inicializar auth:", error);
          set({ isLoading: false });
        }
      },

      login: (token: string, user: any) => {
        AsyncStorage.setItem("token", token);
        AsyncStorage.setItem("user", JSON.stringify(user));
        
        setAuthToken(token);           // ← LINHA QUE FALTAVA!
        set({ token, user, isLoading: false });
      },

      logout: () => {
        AsyncStorage.multiRemove(["token", "user"]);
        setAuthToken(null);
        set({ token: null});
      },

      
    }),
    { name: "auth-storage" }
  )
);