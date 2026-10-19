import { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, View, ViewStyle } from "react-native";
import { COLORS } from "../constants/theme";

// The single loading indicator used across the app: three bouncing dots.
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

const DIMENSIONS = {
  small: { dot: 6, gap: 4, lift: 5 },
  large: { dot: 12, gap: 8, lift: 12 },
};

const DOT_COUNT = 3;
const STAGGER = 140;

type Props = {
  size?: "small" | "large";
  tone?: LoaderTone;
  color?: string; // escape hatch when the spinner must match a dynamic text colour
  style?: StyleProp<ViewStyle>;
};

function Dot({ index, size, tint }: { index: number; size: "small" | "large"; tint: string }) {
  const { dot, lift } = DIMENSIONS[size];
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * STAGGER),
        Animated.timing(t, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        // rest so the dots finish their wave together before the next one starts
        Animated.delay((DOT_COUNT - 1 - index) * STAGGER + 200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, index]);

  return (
    <Animated.View
      style={{
        width: dot,
        height: dot,
        borderRadius: dot / 2,
        backgroundColor: tint,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -lift] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) },
        ],
      }}
    />
  );
}

export default function Loader({ size = "small", tone = "gold", color, style }: Props) {
  const tint = color ?? TONE_COLORS[tone];
  const { dot, gap, lift } = DIMENSIONS[size];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap,
          // reserve room for the bounce so surrounding layout doesn't shift
          height: dot + lift,
          paddingTop: lift,
        },
        style,
      ]}
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} index={i} size={size} tint={tint} />
      ))}
    </View>
  );
}
