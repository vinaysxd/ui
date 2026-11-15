import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { Attendance } from "../../services/attendance.service";
import { AttendanceStatus, STATUS_LABEL, getAttendanceStatus } from "../../utils/attendanceStatus";
import { daysAgo } from "../../utils/datetime";

export type DateRange = "all" | "today" | "7d" | "30d";

export interface AttendanceFilterState {
  search: string;
  staff: string; // "" = all
  site: string; // "" = all
  range: DateRange;
  status: AttendanceStatus | "";
}

export const EMPTY_FILTERS: AttendanceFilterState = { search: "", staff: "", site: "", range: "all", status: "" };

const RANGE_LABEL: Record<DateRange, string> = {
  all: "All dates",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export const activeFilterCount = (f: AttendanceFilterState) =>
  [f.search.trim(), f.staff, f.site, f.status, f.range !== "all" ? f.range : ""].filter(Boolean).length;

export const hasActiveFilters = (f: AttendanceFilterState) =>
  !!(f.search || f.staff || f.site || f.status || f.range !== "all");

export function filterAttendance(records: Attendance[], f: AttendanceFilterState): Attendance[] {
  const q = f.search.trim().toLowerCase();
  const now = new Date();
  const maxDays = f.range === "today" ? 0 : f.range === "7d" ? 6 : f.range === "30d" ? 29 : Infinity;
  return records.filter((r) => {
    const staff = r.staff?.full_name ?? "";
    const site = r.site?.name ?? "";
    if (q && !`${staff} ${site}`.toLowerCase().includes(q)) return false;
    if (f.staff && staff !== f.staff) return false;
    if (f.site && site !== f.site) return false;
    if (daysAgo(r.clock_in, now) > maxDays) return false;
    if (f.status && getAttendanceStatus(r, now) !== f.status) return false;
    return true;
  });
}

interface Option<T extends string> {
  value: T;
  label: string;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const active = !!value && value !== ("all" as T);
  return (
    <>
      <TouchableOpacity style={[styles.select, active && styles.selectActive]} onPress={() => setOpen(true)}>
        <Text style={styles.selectLabel}>{label}</Text>
        <Text style={[styles.selectValue, active && { color: COLORS.gold }]} numberOfLines={1}>
          {current?.label ?? options[0]?.label}
        </Text>
        <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
      </TouchableOpacity>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.value || "__all"}
                  style={styles.option}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, o.value === value && { color: COLORS.gold, fontWeight: "700" }]}>
                    {o.label}
                  </Text>
                  {o.value === value && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface Props {
  records: Attendance[];
  value: AttendanceFilterState;
  onChange: (next: AttendanceFilterState) => void;
  /** Hide the staff dropdown (single-staff views). */
  hideStaff?: boolean;
}

export default function AttendanceFilters({ records, value, onChange, hideStaff = false }: Props) {
  const staffOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.staff?.full_name).filter(Boolean) as string[])).sort();
    return [{ value: "", label: "All staff" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [records]);
  const siteOptions = useMemo(() => {
    const names = Array.from(new Set(records.map((r) => r.site?.name).filter(Boolean) as string[])).sort();
    return [{ value: "", label: "All sites" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [records]);
  const statusOptions: Option<AttendanceStatus | "">[] = [
    { value: "", label: "All statuses" },
    ...(Object.keys(STATUS_LABEL) as AttendanceStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];
  const rangeOptions = (Object.keys(RANGE_LABEL) as DateRange[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }));
  const set = (patch: Partial<AttendanceFilterState>) => onChange({ ...value, ...patch });

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="options-outline" size={15} color={COLORS.textSecondary} />
        <Text style={styles.titleText}>Filters</Text>
        {activeFilterCount(value) > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFilterCount(value)}</Text>
          </View>
        )}
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={hideStaff ? "Search site" : "Search staff or site"}
          placeholderTextColor={COLORS.textMuted}
          value={value.search}
          onChangeText={(search) => set({ search })}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.search ? (
          <TouchableOpacity onPress={() => set({ search: "" })} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.selects}>
        {!hideStaff && (
          <Select label="Staff" value={value.staff} options={staffOptions} onChange={(staff) => set({ staff })} />
        )}
        <Select label="Site" value={value.site} options={siteOptions} onChange={(site) => set({ site })} />
        <Select label="Date" value={value.range} options={rangeOptions} onChange={(range) => set({ range })} />
        <Select label="Status" value={value.status} options={statusOptions} onChange={(status) => set({ status })} />
        {hasActiveFilters(value) && (
          <TouchableOpacity onPress={() => onChange(EMPTY_FILTERS)} style={styles.clear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  titleText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: COLORS.gold, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#1A1A1A", fontSize: 11, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    ...SHADOW.card,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14, outlineStyle: "none" } as any,
  selects: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: 220,
    ...SHADOW.card,
  },
  selectActive: { backgroundColor: COLORS.accentBg },
  selectLabel: { color: COLORS.textMuted, fontSize: 12 },
  selectValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  clear: { paddingHorizontal: 8, paddingVertical: 8 },
  clearText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.card,
  },
  sheetTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  option: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  optionText: { color: COLORS.textPrimary, fontSize: 14 },
});
