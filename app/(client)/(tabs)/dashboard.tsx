import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getClientSites, Site } from "../../../src/services/sites.service";
import { getClientHistory, Attendance } from "../../../src/services/attendance.service";
import { showError } from "../../../src/utils/toast";
import { formatDateTime } from "../../../src/utils/datetime";
import { COLORS, RADIUS } from "../../../src/constants/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />
      }
    >
      <Text style={styles.title}>Home</Text>

      <View style={styles.statsGrid}>
        <StatCard icon="business-outline" label="Total Sites" value={stats.totalSites} />
        <StatCard icon="calendar-outline" label="Staff Visits Today" value={stats.visitsToday} />
        <StatCard icon="checkmark-done-outline" label="Active Staff Now" value={stats.activeNow} />
        <StatCard icon="trending-up-outline" label="Visits This Week" value={stats.visitsThisWeek} />
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity.</Text>
      ) : (
        recentActivity.map((record) => (
          <View key={record.id} style={styles.activityCard}>
            <View style={styles.goldBar} />
            <View style={styles.activityHeader}>
              <Text style={styles.activityStaff}>{record.staff?.full_name ?? "Unknown staff"}</Text>
              {record.clock_out ? null : (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconCircle}>
        <Ionicons name={icon} size={18} color={COLORS.gold} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  goldBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.gold,
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
  activeBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activeBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "600",
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
