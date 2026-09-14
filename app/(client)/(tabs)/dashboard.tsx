import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { getClientSites, Site } from "../../../src/services/sites.service";
import { getClientHistory, Attendance } from "../../../src/services/attendance.service";
import { showError } from "../../../src/utils/toast";
import { formatDateTime } from "../../../src/utils/datetime";

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Home</Text>

      <View style={styles.statsGrid}>
        <StatCard label="Total Sites" value={stats.totalSites} color="#7c3aed" />
        <StatCard label="Staff Visits Today" value={stats.visitsToday} color="#2563eb" />
        <StatCard label="Active Staff Now" value={stats.activeNow} color="#16a34a" />
        <StatCard label="Visits This Week" value={stats.visitsThisWeek} color="#ea580c" />
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity.</Text>
      ) : (
        recentActivity.map((record) => (
          <View key={record.id} style={styles.activityCard}>
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
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
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 13,
    color: "#fff",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
  },
  activeBadge: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  activitySite: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  activityDetail: {
    fontSize: 13,
    color: "#666",
  },
});
