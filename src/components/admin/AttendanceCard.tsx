import { View, Text, StyleSheet } from "react-native";
import { Attendance } from "../../services/attendance.service";
import { COLORS, RADIUS } from "../../constants/theme";
import { formatDateTime } from "../../utils/datetime";

interface AttendanceCardProps {
  record: Attendance;
}

export default function AttendanceCard({ record }: AttendanceCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.staffName}>{record.staff?.full_name ?? "Unknown staff"}</Text>
        <Text style={styles.siteName}>{record.site?.name ?? "Unknown site"}</Text>
        <Text style={styles.time}>{formatDateTime(record.clock_in)}</Text>
      </View>
      {record.clock_out ? (
        <View style={styles.clockedOutBadge}>
          <Text style={styles.clockedOutBadgeText}>Clocked Out</Text>
        </View>
      ) : (
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000000",
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  info: {
    flex: 1,
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
  activeBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeBadgeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
  },
  clockedOutBadge: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clockedOutBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
