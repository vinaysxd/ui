import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClientSite, Site } from "../../../src/services/sites.service";
import { getClientHistory, Attendance, AttendancePhoto } from "../../../src/services/attendance.service";
import { showError } from "../../../src/utils/toast";
import { formatDateTime } from "../../../src/utils/datetime";
import PhotoThumb from "../../../src/components/PhotoThumb";
import NotesPanel from "../../../src/components/NotesPanel";

type Tab = "details" | "attendance" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "attendance", label: "Attendance" },
  { key: "notes", label: "Notes" },
];

const formatDuration = (startIso: string, endIso: string): string => {
  const totalMinutes = Math.max(
    0,
    Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

export default function ClientSiteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSite = async () => {
      setLoading(true);
      try {
        const data = await getClientSite(id);
        setSite(data);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSite();
  }, [id]);

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

        <Text style={styles.name}>{site.name}</Text>

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
              <Row label="Latitude" value={String(site.latitude)} />
              <Row label="Longitude" value={String(site.longitude)} />
            </View>
          </ScrollView>
        )}

        {activeTab === "attendance" && <AttendanceHistory siteId={id} />}

        {activeTab === "notes" && <NotesPanel siteId={id} role="client" />}
      </View>
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
      const all = await getClientHistory();
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
        <Text style={styles.historyStaff}>{record.staff?.full_name ?? "Unknown staff"}</Text>
        <View style={styles.historyHeaderRight}>
          {isActive ? (
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeText}>Active</Text>
            </View>
          ) : null}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#999" />
        </View>
      </View>

      <Text style={styles.historyDetail}>In: {formatDateTime(record.clock_in)}</Text>
      {!isActive && record.clock_out ? (
        <>
          <Text style={styles.historyDetail}>Out: {formatDateTime(record.clock_out)}</Text>
          <Text style={styles.historyDetail}>
            Duration: {formatDuration(record.clock_in, record.clock_out)}
          </Text>
        </>
      ) : null}

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
  return (
    <View style={styles.photoPair}>
      <Text style={styles.photoPairLabel}>{photo.label}</Text>
      <View style={styles.thumbRow}>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>Before</Text>
          <PhotoThumb path={photo.before_photo_url} />
        </View>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>After</Text>
          <PhotoThumb path={photo.after_photo_url} />
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
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
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
  historyStaff: {
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
    alignItems: "flex-start",
  },
  thumbCaption: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
});
