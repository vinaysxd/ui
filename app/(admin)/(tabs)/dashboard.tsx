import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { getAdminDashboard, AdminDashboard } from "../../../src/services/dashboard.service";
import { getRecentAttendance, Attendance } from "../../../src/services/attendance.service";
import { logout } from "../../../src/services/auth.service";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboard | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fetchDashboard = useCallback(async () => {
    setError("");
    try {
      const dashboard = await getAdminDashboard();
      const recent = await getRecentAttendance(10);

      setStats(dashboard);
      setRecentAttendance(recent);
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore logout errors, clear local session regardless
    } finally {
      router.replace("/auth/login");
    }
  };

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
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.blueCard]}>
          <Text style={styles.statValue}>{stats?.total_staff ?? 0}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
        <View style={[styles.statCard, styles.greenCard]}>
          <Text style={styles.statValue}>{stats?.total_clients ?? 0}</Text>
          <Text style={styles.statLabel}>Total Clients</Text>
        </View>
        <View style={[styles.statCard, styles.purpleCard]}>
          <Text style={styles.statValue}>{stats?.total_sites ?? 0}</Text>
          <Text style={styles.statLabel}>Total Sites</Text>
        </View>
        <View style={[styles.statCard, styles.orangeCard]}>
          <Text style={styles.statValue}>{stats?.todays_attendance_count ?? 0}</Text>
          <Text style={styles.statLabel}>Today's Attendance</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Attendance</Text>

      {recentAttendance.length === 0 ? (
        <Text style={styles.emptyText}>No attendance records found.</Text>
      ) : (
        recentAttendance.map((record) => (
          <View key={record.id} style={styles.attendanceRow}>
            <View style={styles.attendanceInfo}>
              <Text style={styles.staffName}>{record.staff?.full_name ?? "Unknown staff"}</Text>
              <Text style={styles.siteName}>{record.site?.name ?? "Unknown site"}</Text>
              <Text style={styles.clockInText}>{formatDateTime(record.clock_in)}</Text>
            </View>
            {record.clock_out ? (
              <Text style={styles.clockOutText}>{formatDateTime(record.clock_out)}</Text>
            ) : (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#000",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  blueCard: {
    backgroundColor: "#2563eb",
  },
  greenCard: {
    backgroundColor: "#16a34a",
  },
  purpleCard: {
    backgroundColor: "#7c3aed",
  },
  orangeCard: {
    backgroundColor: "#ea580c",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statLabel: {
    fontSize: 14,
    color: "#fff",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptyText: {
    color: "#666",
  },
  attendanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  attendanceInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
  },
  siteName: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  clockInText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  clockOutText: {
    fontSize: 12,
    color: "#666",
  },
  activeBadge: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
