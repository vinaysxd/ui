import { Modal, View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { Attendance } from "../../services/attendance.service";
import { getAttendanceStatus, getShiftFlag } from "../../utils/attendanceStatus";
import { formatClockOut, formatDuration, formatRelativeDateTime, spansDays } from "../../utils/datetime";
import StatusPill from "./StatusPill";

interface Props {
  record: Attendance | null;
  onClose: () => void;
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export default function AttendanceDetailModal({ record, onClose }: Props) {
  const router = useRouter();
  const go = (href: string) => {
    onClose();
    router.push(href as any);
  };

  return (
    <Modal transparent animationType="fade" visible={!!record} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {record && (
          <Pressable style={styles.sheet}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{record.staff?.full_name ?? "Unknown staff"}</Text>
                <Text style={styles.subtitle}>{record.site?.name ?? "Unknown site"}</Text>
              </View>
              <StatusPill status={getAttendanceStatus(record)} />
            </View>

            {getShiftFlag(record) && (
              <Text
                style={[
                  styles.flag,
                  getShiftFlag(record)!.level === "danger" ? styles.flagDanger : styles.flagWarning,
                ]}
              >
                ⚠ {getShiftFlag(record)!.label}
              </Text>
            )}

            <View style={styles.grid}>
              <Field label="Clock in" value={formatRelativeDateTime(record.clock_in)} />
              <Field
                label="Clock out"
                value={record.clock_out ? formatClockOut(record.clock_in, record.clock_out) : "Still clocked in"}
                hint={
                  record.clock_out && spansDays(record.clock_in, record.clock_out)
                    ? "Overnight / multi-day shift"
                    : undefined
                }
              />
              <Field
                label={record.clock_out ? "Duration" : "Elapsed"}
                value={formatDuration(record.clock_in, record.clock_out)}
              />
              <Field label="Photos" value={String(record.photos?.length ?? 0)} />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.action}
                disabled={!record.staff_id}
                onPress={() => go(`/(admin)/staff/${record.staff_id}`)}
              >
                <Ionicons name="person-outline" size={16} color={COLORS.gold} />
                <Text style={styles.actionText}>View staff</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.action}
                disabled={!record.site_id}
                onPress={() => go(`/(admin)/sites/${record.site_id}`)}
              >
                <Ionicons name="business-outline" size={16} color={COLORS.gold} />
                <Text style={styles.actionText}>View site</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, styles.closeBtn]} onPress={onClose}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 24 },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 460,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOW.card,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 2 },
  flag: { borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 16, fontSize: 13, fontWeight: "600" },
  flagDanger: { backgroundColor: "rgba(220,38,38,0.15)", color: COLORS.dangerText },
  flagWarning: { backgroundColor: "rgba(245,158,11,0.15)", color: COLORS.warning },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16, marginBottom: 20 },
  field: { width: "50%", paddingRight: 8 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  fieldValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600", marginTop: 3 },
  fieldHint: { color: COLORS.gold, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  actionText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  closeBtn: { marginLeft: "auto", backgroundColor: COLORS.hover },
  closeText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
});
