import { useState } from "react";
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Attendance } from "../../services/attendance.service";
import { COLORS } from "../../constants/theme";
import { formatClockOut, formatDuration, formatRelativeDateTime } from "../../utils/datetime";
import { getAttendanceStatus, getShiftFlag } from "../../utils/attendanceStatus";
import StatusPill from "./StatusPill";

interface AttendanceRowProps {
  record: Attendance;
  /** Row position, used for zebra striping. */
  index?: number;
  onPress?: (record: Attendance) => void;
  /** Hide the staff column (used on a single staff member's page). */
  hideStaff?: boolean;
}

export const COLUMN_FLEX = {
  staff: 2,
  site: 2,
  time: 1.5,
  duration: 1,
  status: 1.2,
};

/** Fixed width of the hover quick-actions column (keeps header and rows aligned). */
export const ACTIONS_WIDTH = 64;

/** Rows clocked in within this window get a gold accent on the left edge. */
export const RECENT_WINDOW_MS = 2 * 60 * 60 * 1000;
export const isRecent = (record: Attendance, now: number = Date.now()) =>
  now - new Date(record.clock_in).getTime() < RECENT_WINDOW_MS;

export default function AttendanceRow({ record, index = 0, onPress, hideStaff = false }: AttendanceRowProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const flag = getShiftFlag(record);
  const status = getAttendanceStatus(record);
  const striped = index % 2 === 1;

  return (
    <Pressable
      onPress={() => onPress?.(record)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={`Open details for ${record.staff?.full_name ?? "attendance record"}`}
      style={[
        styles.row,
        striped && styles.rowStriped,
        (hovered || focused) && styles.rowHovered,
        focused && styles.rowFocused,
        isRecent(record) && styles.rowRecent,
      ]}
    >
      {!hideStaff && (
        <Text style={[styles.staffName, { flex: COLUMN_FLEX.staff }]} numberOfLines={1}>
          {record.staff?.full_name ?? "Unknown staff"}
        </Text>
      )}
      <Text style={[styles.siteName, { flex: COLUMN_FLEX.site }]} numberOfLines={1}>
        {record.site?.name ?? "Unknown site"}
      </Text>
      <Text style={[styles.time, { flex: COLUMN_FLEX.time }]}>{formatRelativeDateTime(record.clock_in)}</Text>
      <Text style={[styles.time, { flex: COLUMN_FLEX.time }]}>
        {record.clock_out ? formatClockOut(record.clock_in, record.clock_out) : "—"}
      </Text>
      <View style={[styles.durationCell, { flex: COLUMN_FLEX.duration }]}>
        {flag && (
          <Ionicons
            name="warning"
            size={14}
            color={flag.level === "danger" ? COLORS.dangerText : COLORS.warning}
            accessibilityLabel={flag.label}
          />
        )}
        <Text
          style={[
            styles.time,
            !record.clock_out && styles.ongoing,
            flag && { color: flag.level === "danger" ? COLORS.dangerText : COLORS.warning, fontWeight: "600" },
          ]}
        >
          {formatDuration(record.clock_in, record.clock_out)}
        </Text>
      </View>
      <View style={{ flex: COLUMN_FLEX.status }}>
        <StatusPill status={status} />
      </View>
      <View style={styles.quick}>
        {hovered && (
          <>
            {!hideStaff && (
              <TouchableOpacity
                hitSlop={6}
                accessibilityLabel="View staff"
                onPress={() => router.push(`/(admin)/staff/${record.staff_id}` as any)}
              >
                <Ionicons name="person-outline" size={16} color={COLORS.gold} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              hitSlop={6}
              accessibilityLabel="View site"
              onPress={() => router.push(`/(admin)/sites/${record.site_id}` as any)}
            >
              <Ionicons name="business-outline" size={16} color={COLORS.gold} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    // Transparent accent keeps columns aligned whether or not a row is recent.
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  rowStriped: { backgroundColor: COLORS.zebra },
  rowHovered: { backgroundColor: COLORS.hover, cursor: "pointer" } as any,
  rowFocused: { outlineWidth: 2, outlineColor: COLORS.gold, outlineStyle: "solid", outlineOffset: -2 } as any,
  durationCell: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowRecent: { borderLeftColor: COLORS.gold },
  staffName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    paddingRight: 8,
  },
  siteName: {
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingRight: 8,
  },
  time: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  ongoing: { color: COLORS.success },
  quick: {
    width: ACTIONS_WIDTH,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});
