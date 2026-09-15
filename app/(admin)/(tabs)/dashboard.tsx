import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAdminDashboard, AdminDashboard } from "../../../src/services/dashboard.service";
import { getRecentAttendance, Attendance } from "../../../src/services/attendance.service";
import { logout } from "../../../src/services/auth.service";
import { COLORS, RADIUS } from "../../../src/constants/theme";
import StatCard from "../../../src/components/admin/StatCard";
import AttendanceCard from "../../../src/components/admin/AttendanceCard";
import AttendanceRow, { COLUMN_FLEX } from "../../../src/components/admin/AttendanceRow";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

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
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hello, Admin 👋</Text>
        <Text style={styles.dateSubtitle}>{formatToday()}</Text>
      </View>
      <TouchableOpacity onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={COLORS.gold} />
      </TouchableOpacity>
    </View>
  );

  const errorBanner = error ? <Text style={styles.errorText}>{error}</Text> : null;

  const sectionHeader = (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Recent Attendance</Text>
      <Text style={styles.sectionSubtitle}>Latest activity</Text>
    </View>
  );

  const statCards = (cardStyle: object) =>
    STAT_ITEMS.map((item) => (
      <StatCard
        key={item.key}
        icon={item.icon}
        label={item.label}
        value={stats?.[item.key] ?? 0}
        style={cardStyle}
      />
    ));

  if (isDesktop) {
    return (
      <LinearGradient colors={["#1A1A1A", "#0D0D0D"]} style={styles.desktopScreen}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.webContent}>
            <View style={styles.maxWidthWrap}>
              {header}
              {errorBanner}

              <View style={styles.statsRowWeb}>{statCards(styles.statCardWeb)}</View>

              {sectionHeader}

              {recentAttendance.length === 0 ? (
                <Text style={styles.emptyText}>No attendance records found.</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.staff }]}>Staff</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.site }]}>Site</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock In</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock Out</Text>
                    <Text style={[styles.th, { flex: COLUMN_FLEX.status }]}>Status</Text>
                  </View>
                  {recentAttendance.map((record) => (
                    <AttendanceRow key={record.id} record={record} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.mobileScreen}>
      <ScrollView
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

        {sectionHeader}

        {recentAttendance.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records found.</Text>
        ) : (
          recentAttendance.map((record) => <AttendanceCard key={record.id} record={record} />)
        )}
      </ScrollView>
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
    marginBottom: 20,
  },
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
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
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
     
    elevation: 8,
  },
  webContent: {
    padding: 28,
    width: "100%",
  },
  maxWidthWrap: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  statsRowWeb: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 28,
  },
  statCardWeb: {
    flex: 1,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCardMobile: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
  },
});
