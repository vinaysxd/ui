import { ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import { COLORS } from "../constants/theme";

// Single loading spinner used across the app.
//  size: "large" for full-screen / page loads, "small" (default) for inline and button loads.
//  tone: "gold" (default) on dark surfaces, "dark" on gold buttons, "danger" on destructive
//        actions, "light" on coloured fills, "muted" inside thumbnails / secondary areas.
export type LoaderTone = "gold" | "dark" | "danger" | "light" | "muted";

const TONE_COLORS: Record<LoaderTone, string> = {
  gold: COLORS.gold,
  dark: "#1A1A1A",
  danger: COLORS.danger,
  light: "#FFFFFF",
  muted: COLORS.textSecondary,
};

type Props = {
  size?: "small" | "large";
  tone?: LoaderTone;
  color?: string; // escape hatch when the spinner must match a dynamic text colour
  style?: StyleProp<ViewStyle>;
};

export default function Loader({ size = "small", tone = "gold", color, style }: Props) {
  return <ActivityIndicator size={size} color={color ?? TONE_COLORS[tone]} style={style} />;
}
