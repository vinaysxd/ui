import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS } from "../constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = "file-tray-outline", title, hint, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={COLORS.gold} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", textAlign: "center" },
  hint: { color: COLORS.textMuted, fontSize: 13, marginTop: 6, textAlign: "center" },
  action: {
    marginTop: 16,
    backgroundColor: COLORS.accentBg,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  actionText: { color: COLORS.gold, fontWeight: "600", fontSize: 13 },
});
