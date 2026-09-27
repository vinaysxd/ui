// React Native Paper (MD3) theme, built from the app's existing design tokens
// in `src/constants/theme.ts`. See docs/paper-migration/DESIGN_RULES.md for
// the full colour-role mapping this file implements and the reasoning behind
// the choices that aren't spelled out by a token 1:1 (secondary/tertiary,
// elevation fill, disabled/inverse/shadow colours).
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme, useTheme } from "react-native-paper";
import type { MD3Theme } from "react-native-paper";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from "expo-router";
import type { Theme as NavigationTheme } from "expo-router";
import { COLORS, LIGHT_COLORS } from "../constants/theme";

/** Colour roles this app adds on top of the standard MD3 palette. */
export interface AppExtraColors {
  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  goldInk: string;
}

export type AppTheme = MD3Theme & {
  colors: MD3Theme["colors"] & AppExtraColors;
};

/** `#RRGGBB` -> `rgba(r, g, b, alpha)`. Used only for disabled-state colours. */
const withAlpha = (hex: string, alpha: number): string => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Dark theme (COLORS). This is the app's only theme in practice today — see
// "Theme mode" in DESIGN_RULES.md — but both are built for completeness and
// because MD3DarkTheme/MD3LightTheme both exist upstream.
export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: 10 / 3,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.gold,
    onPrimary: COLORS.background,
    primaryContainer: COLORS.accentBg,
    onPrimaryContainer: COLORS.goldLight,
    // No distinct secondary/tertiary hue exists in this app's palette (it's a
    // single-accent gold design) — secondary/tertiary alias primary rather
    // than inventing an unused hue.
    secondary: COLORS.gold,
    onSecondary: COLORS.background,
    secondaryContainer: COLORS.accentBg,
    onSecondaryContainer: COLORS.goldLight,
    tertiary: COLORS.gold,
    onTertiary: COLORS.background,
    tertiaryContainer: COLORS.accentBg,
    onTertiaryContainer: COLORS.goldLight,
    background: COLORS.background,
    onBackground: COLORS.textPrimary,
    surface: COLORS.surface,
    onSurface: COLORS.textPrimary,
    surfaceVariant: COLORS.surfaceElevated,
    onSurfaceVariant: COLORS.textSecondary,
    // textMuted is reserved for disabled/placeholder states (see DESIGN_RULES.md).
    surfaceDisabled: withAlpha(COLORS.textMuted, 0.12),
    onSurfaceDisabled: withAlpha(COLORS.textMuted, 0.38),
    outline: COLORS.outline,
    outlineVariant: COLORS.border,
    error: COLORS.dangerText,
    onError: COLORS.background,
    errorContainer: COLORS.dangerBg,
    onErrorContainer: COLORS.dangerText,
    // "Inverse" roles intentionally borrow the *other* theme's tokens — an
    // inverse surface is, by definition, what a surface looks like in the
    // opposite mode. Keeps this file from inventing colours theme.ts doesn't have.
    inverseSurface: LIGHT_COLORS.surface,
    inverseOnSurface: LIGHT_COLORS.textPrimary,
    inversePrimary: LIGHT_COLORS.goldInk,
    shadow: "#000000",
    scrim: "#000000",
    backdrop: "rgba(0, 0, 0, 0.6)",
    elevation: {
      level0: "transparent",
      level1: COLORS.surface,
      level2: COLORS.surfaceElevated,
      // The token set only defines 3 background steps (background -> surface
      // -> surfaceElevated); higher elevation levels reuse the highest step
      // rather than fabricating hex values with no source token.
      level3: COLORS.surfaceElevated,
      level4: COLORS.surfaceElevated,
      level5: COLORS.surfaceElevated,
    },
    // Custom roles (not part of MD3Colors) — mirror how COLORS.success /
    // COLORS.warning are already used today: the plain colour as text/icon
    // on top of its "Bg" counterpart as a tinted chip background.
    success: COLORS.success,
    successContainer: COLORS.successBg,
    warning: COLORS.warning,
    warningContainer: COLORS.warningBg,
    goldInk: COLORS.goldInk,
  },
};

// Light theme (LIGHT_COLORS). No current screen renders in light mode — see
// "Theme mode" in DESIGN_RULES.md — this exists so the app *could* offer one
// without redoing the token work later.
export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: 10 / 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: LIGHT_COLORS.goldInk,
    onPrimary: "#FFFFFF",
    primaryContainer: LIGHT_COLORS.gold,
    onPrimaryContainer: LIGHT_COLORS.textPrimary,
    secondary: LIGHT_COLORS.goldInk,
    onSecondary: "#FFFFFF",
    secondaryContainer: LIGHT_COLORS.accentBg,
    onSecondaryContainer: LIGHT_COLORS.textPrimary,
    tertiary: LIGHT_COLORS.goldInk,
    onTertiary: "#FFFFFF",
    tertiaryContainer: LIGHT_COLORS.accentBg,
    onTertiaryContainer: LIGHT_COLORS.textPrimary,
    background: LIGHT_COLORS.background,
    onBackground: LIGHT_COLORS.textPrimary,
    surface: LIGHT_COLORS.surface,
    onSurface: LIGHT_COLORS.textPrimary,
    surfaceVariant: LIGHT_COLORS.surfaceElevated,
    onSurfaceVariant: LIGHT_COLORS.textSecondary,
    surfaceDisabled: withAlpha(LIGHT_COLORS.textMuted, 0.12),
    onSurfaceDisabled: withAlpha(LIGHT_COLORS.textMuted, 0.38),
    outline: LIGHT_COLORS.outline,
    outlineVariant: LIGHT_COLORS.border,
    error: LIGHT_COLORS.danger,
    onError: "#FFFFFF",
    errorContainer: LIGHT_COLORS.dangerBg,
    onErrorContainer: LIGHT_COLORS.danger,
    inverseSurface: COLORS.surface,
    inverseOnSurface: COLORS.textPrimary,
    inversePrimary: COLORS.gold,
    shadow: "#000000",
    scrim: "#000000",
    backdrop: "rgba(0, 0, 0, 0.6)",
    elevation: {
      level0: "transparent",
      level1: LIGHT_COLORS.surface,
      level2: LIGHT_COLORS.surfaceElevated,
      level3: LIGHT_COLORS.surfaceElevated,
      level4: LIGHT_COLORS.surfaceElevated,
      level5: LIGHT_COLORS.surfaceElevated,
    },
    success: LIGHT_COLORS.success,
    successContainer: LIGHT_COLORS.successBg,
    warning: LIGHT_COLORS.warning,
    warningContainer: LIGHT_COLORS.warningBg,
    goldInk: LIGHT_COLORS.goldInk,
  },
};

// Auth screens are always dark regardless of the app's theme mode (see
// DESIGN_RULES.md "Auth screens always use the dark theme").
export const authTheme: AppTheme = darkTheme;

/** Typed `useTheme()` so `theme.colors.success` etc. type-check. */
export const useAppTheme = (): AppTheme => useTheme<AppTheme>();

// Navigation (Stack/Tabs chrome) themes adapted from the same Paper themes.
// expo-router vendors its own react-navigation `Theme`/`DarkTheme`/`DefaultTheme`
// rather than depending on the `@react-navigation/native` package directly
// (see PLAN.md section A / DESIGN_RULES.md "Theme mode" for why) — Paper's
// `adaptNavigationTheme` doesn't import that package either at runtime, it
// only needs an object shaped like `{ dark, colors, fonts? }`. Its exported
// types aren't public API of `react-native-paper` though (only used
// internally), and expo-router types its `colors.*` as the wider `ColorValue`
// rather than plain `string`, so TS can't structurally match the two on its
// own. Re-declare Paper's expected shape locally and cast through it — the
// runtime objects already match it exactly.
type PaperNavigationTheme = {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
  fonts?: NavigationTheme["fonts"];
};

const { LightTheme: adaptedNavigationLightTheme, DarkTheme: adaptedNavigationDarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme as unknown as PaperNavigationTheme,
  reactNavigationDark: NavigationDarkTheme as unknown as PaperNavigationTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});

export const navigationLightTheme = adaptedNavigationLightTheme as unknown as NavigationTheme;
export const navigationDarkTheme = adaptedNavigationDarkTheme as unknown as NavigationTheme;
