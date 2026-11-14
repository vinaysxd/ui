import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// ---- Theme mode -----------------------------------------------------------
// Styles across the app are built once at import time (StyleSheet.create with
// COLORS), so the mode is read synchronously here and a change takes effect by
// reloading the app (see `setThemeMode`). Defaults to dark, ignoring system theme.
export type ThemeMode = "light" | "dark";
const THEME_KEY = "theme_mode";

function readStoredMode(): ThemeMode {
  try {
    const value =
      Platform.OS === "web"
        ? typeof localStorage !== "undefined"
          ? localStorage.getItem(THEME_KEY)
          : null
        : SecureStore.getItem(THEME_KEY);
    return value === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export const THEME_MODE: ThemeMode = readStoredMode();

export function storeThemeMode(mode: ThemeMode) {
  if (Platform.OS === "web") {
    localStorage.setItem(THEME_KEY, mode);
  } else {
    SecureStore.setItem(THEME_KEY, mode);
  }
}

// Mono palettes: page, side nav, cards and list items share one fill; division
// comes from borders and shadows.
const DARK_MONO = {
  background: "#111111",
  surface: "#111111",
  surfaceElevated: "#111111",
  foreground: "#242424",
  border: "#3A3A3A",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#A67C35",
  goldTint: "#3A3520",
  textPrimary: "#FFFFFF",
  textSecondary: "#B4B4B4",
  textMuted: "#666666",
  success: "#4CAF50",
  successBg: "#1A2E1A",
  danger: "#E53935",
  dangerBg: "#2E1A1A",
  warning: "#F59E0B",
  warningBg: "#2E2A1A",
  accentBg: "#2E2A1A",
  goldInk: "#C9A84C",
  outline: "#757575",
  dangerText: "#EF5350",
  // Dark mode: shadow takes the lighter card tone so it reads as a soft halo on the dark page.
  shadow: "#242424",
  shadowOpacity: 0.6,
  zebra: "rgba(255,255,255,0.03)",
  hover: "rgba(255,255,255,0.06)",
};

const LIGHT_MONO: typeof DARK_MONO = {
  background: "#EBEBEB",
  surface: "#EBEBEB",
  surfaceElevated: "#EBEBEB",
  foreground: "#F7F7F7",
  border: "#D0D0D0",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#A67C35",
  goldTint: "#DCD3B4",
  textPrimary: "#1A1A1A",
  textSecondary: "#555555",
  textMuted: "#8A8A8A",
  success: "#2E7D32",
  successBg: "#DCEBDD",
  danger: "#C62828",
  dangerBg: "#F6DAD7",
  warning: "#B45309",
  warningBg: "#F3E6C8",
  accentBg: "#E3DCC4",
  goldInk: "#8A6A25",
  outline: "#8A8A8A",
  dangerText: "#C62828",
  shadow: "#000000",
  shadowOpacity: 0.14,
  zebra: "rgba(0,0,0,0.03)",
  hover: "rgba(0,0,0,0.06)",
};

export const COLORS: typeof DARK_MONO = THEME_MODE === "dark" ? DARK_MONO : LIGHT_MONO;

export const LIGHT_COLORS: typeof COLORS = {
  background: "#FAF8F3",
  surface: "#FFFFFF",
  surfaceElevated: "#F1EDE3",
  foreground: "#FFFFFF",
  border: "#E2DCCB",
  gold: "#C9A84C",
  goldLight: "#E8C97A",
  goldDark: "#A67C35",
  textPrimary: "#1A1A1A",
  textSecondary: "#5A5A5A",
  textMuted: "#9A9A9A",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  danger: "#C62828",
  dangerBg: "#FDECEA",
  warning: "#B45309",
  warningBg: "#FFF8E1",
  accentBg: "#F5EFDA",
  goldTint: "#F0E8CC",
  shadow: "#000000",
  shadowOpacity: 0.14,
  zebra: "rgba(0,0,0,0.025)",
  hover: "rgba(0,0,0,0.05)",
  goldInk: "#8A6A25",
  outline: "#8A8578",
  dangerText: "#C62828",
};

// Shadows replace outline borders for separating cards, tables and inputs.
const shadowBase = { shadowColor: COLORS.shadow, shadowOpacity: COLORS.shadowOpacity };
export const SHADOW = {
  card: { ...shadowBase, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  side: { ...shadowBase, shadowRadius: 10, shadowOffset: { width: 4, height: 0 }, elevation: 6 },
  up: { ...shadowBase, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const RADIUS = { sm: 6, md: 8, lg: 16, xl: 24, full: 999 };
