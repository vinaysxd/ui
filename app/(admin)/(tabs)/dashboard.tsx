import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getAdminDashboard, AdminDashboard } from "../../../src/services/dashboard.service";
import { getRecentAttendance, Attendance } from "../../../src/services/attendance.service";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import StatCard from "../../../src/components/admin/StatCard";
import AttendanceCard from "../../../src/components/admin/AttendanceCard";
import AttendanceRow, { ACTIONS_WIDTH, COLUMN_FLEX } from "../../../src/components/admin/AttendanceRow";
import Skeleton from "../../../src/components/Skeleton";
import EmptyState from "../../../src/components/EmptyState";
import AttendanceDetailModal from "../../../src/components/admin/AttendanceDetailModal";
import { exportCsv, printAttendance } from "../../../src/utils/exportAttendance";
import PaginationControls from "../../../src/components/PaginationControls";
import AttendanceFilters, {
  AttendanceFilterState,
  EMPTY_FILTERS,
  filterAttendance,
  hasActiveFilters,
} from "../../../src/components/admin/AttendanceFilters";
import { sortMostRecent } from "../../../src/utils/attendanceStatus";
import { buildSampleAttendance } from "../../../src/utils/sampleAttendance";

// Extra fields the server now returns on /admin/dashboard (not yet in AdminDashboard's type).
type DashboardStats = AdminDashboard & {
  clocked_in_now?: number;
  clocked_out_today?: number;
  long_shift_count?: number;
  long_shift_alerts?: { staff_name: string }[];
};

const PAGE_SIZE = 10;
// In dev builds, fall back to realistic sample records when the API has little
// data (or force them with EXPO_PUBLIC_SAMPLE_DATA=1). Never used in release builds.
const FORCE_SAMPLE = process.env.EXPO_PUBLIC_SAMPLE_DATA === "1";
const MIN_REAL_RECORDS = 5;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatClock = (d: Date): string =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const formatToday = (): string => {
  const now = new Date();
  return `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
};

const STAT_ITEMS = [
  { key: "total_staff", label: "Total Staff", icon: "people-outline" as const },
  { key: "total_clients", label: "Total Clients", icon: "briefcase-outline" as const },
  { key: "total_sites", label: "Total Sites", icon: "business-outline" as const },
  { key: "todays_attendance_count", label: "Today's Attendance", icon: "checkmark-done-outline" as const },
] as const;

export default function AdminDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [usingSample, setUsingSample] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<AttendanceFilterState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Attendance | null>(null);
  const [page, setPage] = useState<number>(1);
  const [visible, setVisible] = useState<number>(PAGE_SIZE);

  const updateFilters = (next: AttendanceFilterState) => {
    setFilters(next);
    setPage(1);
    setVisible(PAGE_SIZE);
  };

  const fetchDashboard = useCallback(async () => {
    setError("");
    try {
      const dashboard = await getAdminDashboard();
      let recent = await getRecentAttendance(20);
      const sample = __DEV__ && (FORCE_SAMPLE || recent.length < MIN_REAL_RECORDS);
      if (sample) recent = buildSampleAttendance();

      setStats(dashboard);
      setLastUpdated(new Date());
      setUsingSample(sample);
      setRecentAttendance(sortMostRecent(recent));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const filtered = useMemo(() => filterAttendance(recentAttendance, filters), [recentAttendance, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clockedInNow = stats?.clocked_in_now ?? 0;
  const longShiftCount = stats?.long_shift_count ?? 0;
  const longShiftNames = (stats?.long_shift_alerts ?? []).map((a) => a.staff_name).join(", ");

  const insightParts: string[] = [
    `${clockedInNow} staff currently clocked in`,
    `${stats?.clocked_out_today ?? 0} clocked out today`,
  ];
  if (longShiftCount > 0) {
    insightParts.push(`${longShiftCount} long shift alert${longShiftCount === 1 ? "" : "s"}`);
  }

  if (loading) {
    return (
      <View style={[styles.mobileScreen, { padding: isDesktop ? 32 : 16 }]}>
        <Skeleton width={180} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={120} height={13} style={{ marginBottom: 28 }} />
        <View style={isDesktop ? styles.statsRowWeb : styles.statsGridMobile}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={isDesktop ? 112 : 96} radius={RADIUS.md} style={{ flex: 1, flexBasis: isDesktop ? undefined : "48%" }} />
          ))}
        </View>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={isDesktop ? 44 : 64} radius={RADIUS.md} style={{ marginBottom: 8 }} />
        ))}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, Admin 👋</Text>
        <Text style={styles.dateSubtitle}>{formatToday()}</Text>
      </View>
      <TouchableOpacity style={styles.liveChip} onPress={onRefresh} accessibilityLabel="Refresh dashboard">
        <Ionicons name="refresh" size={14} color={COLORS.gold} />
        <Text style={styles.liveText}>
          {refreshing ? "Refreshing…" : lastUpdated ? `Refresh · updated ${formatClock(lastUpdated)}` : "Refresh"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const errorBanner = error ? <Text style={styles.errorText}>{error}</Text> : null;

  const sectionHeader = (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        <Text style={styles.sectionSubtitle}>
          {usingSample ? "Sample data · " : ""}
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
          {hasActiveFilters(filters) ? " (filtered)" : ""} · newest first
        </Text>
      </View>
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, filtered.length === 0 && { opacity: 0.4 }]}
          disabled={filtered.length === 0}
          onPress={() => exportCsv(filtered).catch(() => {})}
        >
          <Ionicons name="download-outline" size={15} color={COLORS.gold} />
          <Text style={styles.exportText}>Export CSV</Text>
        </TouchableOpacity>
        {Platform.OS === "web" && (
          <TouchableOpacity
            style={[styles.exportBtn, filtered.length === 0 && { opacity: 0.4 }]}
            disabled={filtered.length === 0}
            onPress={() => printAttendance(filtered)}
          >
            <Ionicons name="print-outline" size={15} color={COLORS.gold} />
            <Text style={styles.exportText}>Print</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const insightBar = (
    <View style={styles.insight}>
      <Ionicons name="pulse-outline" size={16} color={COLORS.gold} />
      <Text style={styles.insightText}>{insightParts.join("  •  ")}</Text>
    </View>
  );

  const alertBanner =
    longShiftCount > 0 ? (
      <View style={styles.alertBanner}>
        <Text style={styles.alertTitle}>
          ⚠ {longShiftCount} staff clocked in over 16 hours
        </Text>
        {longShiftNames ? <Text style={styles.alertNames}>{longShiftNames}</Text> : null}
      </View>
    ) : null;

  const detailModal = <AttendanceDetailModal record={selected} onClose={() => setSelected(null)} />;

  const filterBar = <AttendanceFilters records={recentAttendance} value={filters} onChange={updateFilters} />;

  const statCards = (cardStyle: object) =>
    STAT_ITEMS.map((item) => {
      const extra = item.key === "total_staff" ? { sub: `${clockedInNow} clocked in now` } : {};
      return (
        <StatCard
          key={item.key}
          icon={item.icon}
          label={item.label}
          value={stats?.[item.key] ?? 0}
          style={cardStyle}
          {...extra}
        />
      );
    });

  const emptyMessage = hasActiveFilters(filters) ? (
    <EmptyState
      icon="search-outline"
      title="No records match these filters"
      hint="Try a different staff member, site or date range."
      actionLabel="Clear filters"
      onAction={() => updateFilters(EMPTY_FILTERS)}
    />
  ) : (
    <EmptyState
      icon="time-outline"
      title="No attendance yet"
      hint="Clock-ins from your staff will show up here."
    />
  );

  if (isDesktop) {
    return (
      <LinearGradient colors={[COLORS.surface, COLORS.surface]} style={styles.desktopScreen}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.webContent}>
            <View style={styles.maxWidthWrap}>
              {header}
              {errorBanner}

              <View style={styles.statsRowWeb}>{statCards(styles.statCardWeb)}</View>
              {alertBanner}

              {sectionHeader}
              {insightBar}
              {filterBar}

              {filtered.length === 0 ? (
                emptyMessage
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.staff }]}>Staff</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.site }]}>Site</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock In</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock Out</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.duration }]}>Duration</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.status }]}>Status</Text>
                    <View style={{ width: ACTIONS_WIDTH }} />
                  </View>
                  {pageRows.map((record, i) => (
                    <AttendanceRow key={record.id} record={record} index={i} onPress={setSelected} />
                  ))}
                </View>
              )}
              {filtered.length > PAGE_SIZE && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  total={filtered.length}
                  limit={PAGE_SIZE}
                  onPageChange={setPage}
                />
              )}
            </View>
          </ScrollView>
        </View>
        {detailModal}
      </LinearGradient>
    );
  }

  return (
    <View style={styles.mobileScreen}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.mobileContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
      >
        {header}
        {errorBanner}

        <View style={styles.statsGridMobile}>{statCards(styles.statCardMobile)}</View>
        {alertBanner}

        {sectionHeader}
        {insightBar}
        {filterBar}

        {filtered.length === 0
          ? emptyMessage
          : filtered.slice(0, visible).map((record) => <AttendanceCard key={record.id} record={record} onPress={setSelected} />)}
        {filtered.length > visible && (
          <TouchableOpacity style={styles.showMore} onPress={() => setVisible((v) => v + PAGE_SIZE)}>
            <Text style={styles.showMoreText}>Show more ({filtered.length - visible} remaining)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {detailModal}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...SHADOW.card,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  liveText: { color: COLORS.textSecondary, fontSize: 12 },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  dateSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  exportRow: { flexDirection: "row", gap: 8 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    ...SHADOW.card,
  },
  exportText: { color: COLORS.gold, fontSize: 12, fontWeight: "600" },
  insight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  alertBanner: {
    backgroundColor: "rgba(220, 38, 38, 0.15)",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  alertTitle: { color: "#EF4444", fontSize: 14, fontWeight: "700" },
  alertNames: { color: "#EF4444", fontSize: 13, marginTop: 4 },
  insightText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "500", flexShrink: 1 },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  showMore: {
    alignSelf: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
    ...SHADOW.card,
  },
  showMoreText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
  sectionSubtitle: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 2,
  },

  // Web: floating dark card on gradient background
  desktopScreen: {
    flex: 1,
  },
  card: {
    flex: 1,
    margin: 24, 
     
    elevation: 0,
  },
  webContent: {
    padding: 32,
    width: "100%",
  },
  maxWidthWrap: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  statsRowWeb: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 40,
  },
  statCardWeb: {
    padding: 20,
  },
  table: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  th: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Mobile
  mobileScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGridMobile: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 32,
  },
  statCardMobile: {
    flexBasis: "48%",
    flexGrow: 1,
  },
});
