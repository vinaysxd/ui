import { View, Text, StyleSheet } from "react-native";
import { Attendance } from "../../services/attendance.service";
import { COLORS, RADIUS } from "../../constants/theme";
import { formatTime } from "../../utils/datetime";

interface AttendanceRowProps {
  record: Attendance;
}

export const COLUMN_FLEX = {
  staff: 2,
  site: 2,
  time: 1.2,
  status: 1,
};

export default function AttendanceRow({ record }: AttendanceRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.staffName, { flex: COLUMN_FLEX.staff }]}>
        {record.staff?.full_name ?? "Unknown staff"}
      </Text>
      <Text style={[styles.siteName, { flex: COLUMN_FLEX.site }]}>
        {record.site?.name ?? "Unknown site"}
      </Text>
      <Text style={[styles.time, { flex: COLUMN_FLEX.time }]}>{formatTime(record.clock_in)}</Text>
      <Text style={[styles.time, { flex: COLUMN_FLEX.time }]}>
        {record.clock_out ? formatTime(record.clock_out) : "—"}
      </Text>
      <View style={{ flex: COLUMN_FLEX.status }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  staffName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  siteName: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  activeBadge: {
    alignSelf: "flex-start",
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
    alignSelf: "flex-start",
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
