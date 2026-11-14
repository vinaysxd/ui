import { View, Text, StyleSheet } from "react-native";
import { COLORS, RADIUS } from "../../constants/theme";
import { AttendanceStatus, STATUS_LABEL } from "../../utils/attendanceStatus";

// green = Clocked In, neutral = Clocked Out, red = Long Shift
const PILL: Record<AttendanceStatus, { bg: string; fg: string }> = {
  clocked_in: { bg: COLORS.successBg, fg: COLORS.success },
  clocked_out: { bg: COLORS.hover, fg: COLORS.textSecondary },
  long_shift: { bg: COLORS.dangerBg, fg: COLORS.dangerText },
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
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
