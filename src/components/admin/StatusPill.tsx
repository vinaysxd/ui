import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";
import { AttendanceStatus, STATUS_LABEL } from "../../utils/attendanceStatus";

// green = Clocked In, neutral = Clocked Out, red = Long Shift
// Background is the same hue as the text at ~22% strength (hex alpha "38"), so pills stand out on dark cards.
const tint = (fg: string) => ({ bg: `${fg}38`, fg });
const PILL: Record<AttendanceStatus, { bg: string; fg: string }> = {
  clocked_in: tint(COLORS.success),
  clocked_out: tint(COLORS.textSecondary),
  long_shift: tint(COLORS.dangerText),
};

export default function StatusPill({ status }: { status: AttendanceStatus }) {
  const { bg, fg } = PILL[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.text, { color: fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
});
