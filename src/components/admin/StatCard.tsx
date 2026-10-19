import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../../constants/theme";

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  style?: ViewStyle;
}

export default function StatCard({ icon, label, value, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={COLORS.gold} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    shadowColor: "#000000",
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
});
