import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";

export interface StatTrend {
  /** Change versus the comparison period. 0 renders as a neutral "no change". */
  delta: number;
  /** e.g. "vs yesterday" */
  label: string;
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  /** Secondary line under the value, e.g. "3 clocked in now". */
  sub?: string;
  trend?: StatTrend;
  style?: ViewStyle;
}

export default function StatCard({ icon, label, value, sub, trend, style }: StatCardProps) {
  const up = trend && trend.delta > 0;
  const down = trend && trend.delta < 0;
  const trendColor = up ? COLORS.success : down ? COLORS.dangerText : COLORS.textMuted;
  const arrow = up ? "↑" : down ? "↓" : "→";

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={16} color={COLORS.gold} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {trend ? (
        <View style={styles.subRow}>
          <View style={[styles.trendChip, { backgroundColor: COLORS.hover }]}>
            <Text style={[styles.trendText, { color: trendColor }]}>
              {arrow} {Math.abs(trend.delta)}
            </Text>
          </View>
          <Text style={styles.sub}>{trend.label}</Text>
        </View>
      ) : sub ? (
        <Text style={[styles.sub, { marginTop: 6 }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    backgroundColor: COLORS.cardHigh,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldTint,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flexShrink: 1,
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  trendChip: {
    borderRadius: RADIUS.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  trendText: { fontSize: 12, fontWeight: "700" },
  sub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 0,
  },
});
