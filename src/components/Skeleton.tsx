import { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleProp, ViewStyle } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

// Pulsing placeholder block shown while data loads.
export default function Skeleton({
  width = "100%",
  height = 14,
  radius = RADIUS.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: COLORS.hover, opacity }, style]}
    />
  );
}
