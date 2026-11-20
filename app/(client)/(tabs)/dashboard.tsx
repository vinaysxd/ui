import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import StatCard from "../../../src/components/admin/StatCard";
import { getClientSites, Site } from "../../../src/services/sites.service";
import { getClientHistory, Attendance } from "../../../src/services/attendance.service";
import { showError } from "../../../src/utils/toast";
import { formatDateTime } from "../../../src/utils/datetime";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import Skeleton from "../../../src/components/Skeleton";
import EmptyState from "../../../src/components/EmptyState";
import StatusPill from "../../../src/components/admin/StatusPill";
import { getAttendanceStatus } from "../../../src/utils/attendanceStatus";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatToday = (): string => {
  const now = new Date();
  return `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
};

export default function ClientHomeScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    try {
      const [mySites, myHistory] = await Promise.all([getClientSites(), getClientHistory()]);
      setSites(mySites);
      setHistory(myHistory);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const siteNameById = useMemo(() => {
    return Object.fromEntries(sites.map((site) => [site.id, site.name]));
  }, [sites]);

  const stats = useMemo(() => {
    const now = Date.now();
    const todayKey = new Date().toDateString();

    const visitsToday = history.filter(
      (record) => new Date(record.clock_in).toDateString() === todayKey
    ).length;

    const activeNow = history.filter((record) => !record.clock_out).length;

    const visitsThisWeek = history.filter(
      (record) => now - new Date(record.clock_in).getTime() <= 7 * DAY_MS
    ).length;

    return {
      totalSites: sites.length,
      visitsToday,
      activeNow,
      visitsThisWeek,
    };
  }, [sites, history]);

  const recentActivity = useMemo(() => history.slice(0, 5), [history]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton width={140} height={24} style={{ marginBottom: 8 }} />
          <Skeleton width={120} height={13} style={{ marginBottom: 24 }} />
          <View style={styles.statsGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={96} radius={RADIUS.md} style={{ flexBasis: "48%", flexGrow: 1 }} />
            ))}
          </View>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={RADIUS.md} style={{ marginBottom: 12 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
      }
    >
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>{formatToday()}</Text>

      <View style={styles.statsGrid}>
        <StatCard icon="business-outline" label="Total Sites" value={stats.totalSites} style={styles.statCard} />
        <StatCard icon="calendar-outline" label="Staff Visits Today" value={stats.visitsToday} style={styles.statCard} />
        <StatCard icon="checkmark-done-outline" label="Active Staff Now" value={stats.activeNow} style={styles.statCard} />
        <StatCard icon="trending-up-outline" label="Visits This Week" value={stats.visitsThisWeek} style={styles.statCard} />
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <EmptyState icon="time-outline" title="No recent activity" hint="Staff visits to your sites will show up here." />
      ) : (
        recentActivity.map((record) => (
          <View key={record.id} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityStaff}>{record.staff?.full_name ?? "Unknown staff"}</Text>
              <StatusPill status={getAttendanceStatus(record)} />
            </View>
            <Text style={styles.activitySite}>{siteNameById[record.site_id] ?? "Unknown site"}</Text>
            <Text style={styles.activityDetail}>In: {formatDateTime(record.clock_in)}</Text>
            {record.clock_out ? (
              <Text style={styles.activityDetail}>Out: {formatDateTime(record.clock_out)}</Text>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  activityStaff: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  activitySite: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
