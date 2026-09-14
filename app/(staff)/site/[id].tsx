import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMySite, Site } from "../../../src/services/sites.service";
import {
  getActiveAttendance,
  clockIn,
  clockOut,
  getMyHistory,
  ActiveAttendanceResponse,
  Attendance,
  AttendancePhoto,
} from "../../../src/services/attendance.service";
import {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  Coordinates,
} from "../../../src/services/location.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { formatDateTime } from "../../../src/utils/datetime";
import PhotoUploadModal from "../../../src/components/PhotoUploadModal";
import NotesPanel from "../../../src/components/NotesPanel";

type Tab = "details" | "attendance" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "attendance", label: "Attendance" },
  { key: "notes", label: "Notes" },
];

const formatDistance = (distanceKm: number | null): string => {
  if (distanceKm === null) {
    return "Distance unavailable";
  }
  return `${distanceKm.toFixed(1)} km away`;
};

const formatElapsed = (clockInIso: string): string => {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(clockInIso).getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

const formatDuration = (startIso: string, endIso: string): string => {
  const totalMinutes = Math.max(
    0,
    Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

export default function StaffSiteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendanceResponse | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [acting, setActing] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  const [photoModalVisible, setPhotoModalVisible] = useState<boolean>(false);

  const fetchSite = useCallback(async () => {
    try {
      const data = await getMySite(id);
      setSite(data);
    } catch (err: any) {
      showError(err.message);
    }
  }, [id]);

  const fetchActive = useCallback(async () => {
    try {
      const data = await getActiveAttendance();
      setActiveAttendance(data);
    } catch (err: any) {
      showError(err.message);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const granted = await requestLocationPermission();
      if (granted) {
        try {
          setLocation(await getCurrentLocation());
        } catch {
          showError("Unable to get current location");
        }
      }
      await Promise.all([fetchSite(), fetchActive()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchSite, fetchActive]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const isActiveHere =
    !!activeAttendance?.active && activeAttendance.attendance?.site_id === id;
  const activeElsewhere = !!activeAttendance?.active && !isActiveHere;
  const attendanceId = isActiveHere ? activeAttendance!.attendance!.id : null;

  const distanceKm =
    location && site
      ? calculateDistance(location.latitude, location.longitude, site.latitude, site.longitude)
      : null;

  const handleClockIn = async () => {
    if (!location) {
      showError("Current location is unavailable");
      return;
    }
    setActing(true);
    try {
      await clockIn(id, location.latitude, location.longitude);
      showSuccess(`Clocked in at ${site?.name ?? "site"}`);
      await fetchActive();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActing(false);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      showError("Current location is unavailable");
      return;
    }
    setActing(true);
    try {
      await clockOut(id, location.latitude, location.longitude);
      showSuccess(`Clocked out of ${site?.name ?? "site"}`);
      await fetchActive();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.header}>
          <Text style={styles.name}>{site.name}</Text>
          {isActiveHere ? (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeText}>Clocked In</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.tabContent}>
        {activeTab === "details" && (
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Row label="Address" value={site.address} />
              <Row label="Client" value={site.client?.full_name ?? "Not assigned"} />
              <Row label="Distance" value={formatDistance(distanceKm)} />
            </View>

            <View
              style={[
                styles.statusCard,
                isActiveHere ? styles.statusCardActive : styles.statusCardInactive,
              ]}
            >
              <Text style={isActiveHere ? styles.statusCardText : styles.statusCardTextInactive}>
                {isActiveHere
                  ? `Clocked in · ${formatElapsed(activeAttendance!.attendance!.clock_in)}`
                  : activeElsewhere
                    ? "Clocked in at another site"
                    : "Not clocked in"}
              </Text>
            </View>

            {isActiveHere ? (
              <TouchableOpacity
                style={styles.clockOutButton}
                onPress={handleClockOut}
                disabled={acting}
              >
                {acting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.clockOutButtonText}>Clock Out</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.clockInButton, activeElsewhere && styles.clockInButtonDisabled]}
                onPress={handleClockIn}
                disabled={activeElsewhere || acting}
              >
                {acting ? (
                  <ActivityIndicator color="#333" size="small" />
                ) : (
                  <Text style={styles.clockInButtonText}>Clock In</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              {isActiveHere ? (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => setPhotoModalVisible(true)}
                >
                  <Text style={styles.uploadButtonText}>Manage Photos</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptyText}>Clock in at this site to add before/after photos.</Text>
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === "attendance" && <AttendanceHistory siteId={id} />}

        {activeTab === "notes" && <NotesPanel siteId={id} />}
      </View>

      <PhotoUploadModal
        visible={photoModalVisible}
        attendanceId={attendanceId}
        siteName={site.name}
        onClose={() => {
          setPhotoModalVisible(false);
          fetchActive();
        }}
      />
    </View>
  );
}

function AttendanceHistory({ siteId }: { siteId: string }) {
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const all = await getMyHistory();
      setHistory(all.filter((record) => record.site_id === siteId));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.emptyText}>No attendance history for this site.</Text>}
      renderItem={({ item }) => (
        <AttendanceCard
          record={item}
          expanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
        />
      )}
    />
  );
}

function AttendanceCard({
  record,
  expanded,
  onToggle,
}: {
  record: Attendance;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isActive = !record.clock_out;

  return (
    <TouchableOpacity style={styles.historyCard} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.historyCardHeader}>
        <Text style={styles.historyTime}>{formatDateTime(record.clock_in)}</Text>
        <View style={styles.historyHeaderRight}>
          {isActive ? (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeText}>Active</Text>
            </View>
          ) : null}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#999" />
        </View>
      </View>

      {!isActive && record.clock_out ? (
        <>
          <Text style={styles.historyDetail}>Out: {formatDateTime(record.clock_out)}</Text>
          <Text style={styles.historyDetail}>
            Duration: {formatDuration(record.clock_in, record.clock_out)}
          </Text>
        </>
      ) : null}

      <Text style={styles.historyDetail}>
        {record.photos.length} photo {record.photos.length === 1 ? "pair" : "pairs"}
      </Text>

      {expanded && record.photos.length > 0 ? (
        <View style={styles.photoPairsContainer}>
          {record.photos.map((photo) => (
            <HistoryPhotoPair key={photo.id} photo={photo} />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function HistoryPhotoPair({ photo }: { photo: AttendancePhoto }) {
  const [beforeFailed, setBeforeFailed] = useState<boolean>(false);
  const [afterFailed, setAfterFailed] = useState<boolean>(false);
  console.log("beforeFailed",beforeFailed)
  return (
    <View style={styles.photoPair}>
      <Text style={styles.photoPairLabel}>{photo.label}</Text>
      <View style={styles.thumbRow}>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>Before</Text>
          {photo.before_photo_url && !beforeFailed ? (
            <Image
              source={{ uri: photo.before_photo_url }}
              style={styles.thumb}
              onError={() => setBeforeFailed(true)}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color="#999" />
            </View>
          )}
        </View>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>After</Text>
          {photo.after_photo_url && !afterFailed ? (
            <Image
              source={{ uri: photo.after_photo_url }}
              style={styles.thumb}
              onError={() => setAfterFailed(true)}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color="#999" />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="arrow-back" size={20} color="#000" />
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tabBar: {
    flexDirection: "row",
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#000",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#000",
  },
  tabContent: {
    flex: 1,
  },
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
  },
  badge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeActive: {
    backgroundColor: "#16a34a",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rowLabel: {
    fontSize: 14,
    color: "#666",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 16,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusCardActive: {
    backgroundColor: "#16a34a",
  },
  statusCardInactive: {
    backgroundColor: "#e5e5e5",
  },
  statusCardText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  statusCardTextInactive: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
  clockInButton: {
    backgroundColor: "#e5e5e5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  clockInButtonDisabled: {
    opacity: 0.5,
  },
  clockInButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  clockOutButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  clockOutButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  uploadButton: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyTime: {
    fontSize: 15,
    fontWeight: "600",
  },
  historyDetail: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  photoPairsContainer: {
    marginTop: 12,
    gap: 12,
  },
  photoPair: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  photoPairLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 16,
  },
  thumbColumn: {
    flex: 1,
  },
  thumbCaption: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  thumb: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  thumbPlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
});
