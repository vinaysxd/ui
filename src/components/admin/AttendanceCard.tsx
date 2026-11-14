import { Text, View, Pressable, StyleSheet } from "react-native";
import { Attendance } from "../../services/attendance.service";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { formatClockOut, formatDuration, formatRelativeDateTime } from "../../utils/datetime";
import { getAttendanceStatus } from "../../utils/attendanceStatus";
import StatusPill from "./StatusPill";
import { isRecent } from "./AttendanceRow";

interface AttendanceCardProps {
  record: Attendance;
  onPress?: (record: Attendance) => void;
}

export default function AttendanceCard({ record, onPress }: AttendanceCardProps) {
  const when = record.clock_out
    ? `${formatRelativeDateTime(record.clock_in)} → ${formatClockOut(record.clock_in, record.clock_out)} · ${formatDuration(record.clock_in, record.clock_out)}`
    : formatRelativeDateTime(record.clock_in);

  return (
    <Pressable onPress={() => onPress?.(record)} style={[styles.card, isRecent(record) && styles.cardRecent]}>
      <View style={styles.info}>
        <Text style={styles.staffName}>{record.staff?.full_name ?? "Unknown staff"}</Text>
        <Text style={styles.siteName}>{record.site?.name ?? "Unknown site"}</Text>
        <Text style={styles.time}>{when}</Text>
      </View>
      <StatusPill status={getAttendanceStatus(record)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    ...SHADOW.card,
  },
  cardRecent: { borderLeftColor: COLORS.gold },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  staffName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  siteName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
