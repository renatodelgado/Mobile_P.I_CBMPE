import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";

export const lightTheme = {
  background: "#f8fafc",
  surface: "#fff",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  muted: "#94a3b8",
  danger: "#dc2625",
  dangerText: "#991b1b",
  success: "#10B981",
  info: "#3B82F6",
};

export const darkTheme = {
  background: "#0b1220",
  surface: "#0f172a",
  border: "#1f2937",
  textPrimary: "#f1f5f9",
  textSecondary: "#cbd5e1",
  muted: "#94a3b8",
  danger: "#ef4444",
  dangerText: "#fecaca",
  success: "#34d399",
  info: "#60a5fa",
};

type ThemeContextValue = {
  dark: boolean;
  toggle: () => Promise<void>;
  setDark: (v: boolean) => Promise<void>;
};

const STORAGE_KEY = "@app_theme_dark";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dark, setDarkState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw !== null) setDarkState(raw === "1");
      } catch (err) {
        console.warn("Failed to load theme:", err);
      }
    })();
  }, []);

  const setDark = useCallback(async (v: boolean) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch (err) {
      console.warn("Failed to save theme:", err);
    }
    setDarkState(v);
  }, []);

  const toggle = useCallback(async () => setDark(!dark), [dark, setDark]);

  const theme = dark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ dark, toggle, setDark }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export default ThemeContext;
