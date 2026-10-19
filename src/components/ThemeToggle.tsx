import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, THEME_MODE, ThemeMode } from "../constants/theme";
import { setThemeMode } from "../theme/themeMode";

const OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { mode: "light", label: "Light", icon: "sunny-outline" },
  { mode: "dark", label: "Dark", icon: "moon-outline" },
];

// Light / dark switch. Picking the other mode saves it and reloads the app.
export default function ThemeToggle({ last }: { last?: boolean }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.label}>Appearance</Text>
      <View style={styles.segmented}>
        {OPTIONS.map((option) => {
          const active = option.mode === THEME_MODE;
          return (
            <TouchableOpacity
              key={option.mode}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => {
                if (!active) setThemeMode(option.mode);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={option.icon} size={16} color={active ? "#1A1A1A" : COLORS.textSecondary} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 2,
    gap: 2,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  segmentActive: {
    backgroundColor: COLORS.gold,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#1A1A1A",
  },
});
