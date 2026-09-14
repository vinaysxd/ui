import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  Coordinates,
} from "../../../src/services/location.service";
import { getMySites, Site } from "../../../src/services/sites.service";
import {
  getActiveAttendance,
  clockIn,
  clockOut,
  ActiveAttendanceResponse,
} from "../../../src/services/attendance.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import PhotoUploadModal from "../../../src/components/PhotoUploadModal";
import NotesModal from "../../../src/components/NotesModal";

interface SiteWithDistance extends Site {
  distanceKm: number | null;
}

const formatDistance = (distanceKm: number | null): string => {
  if (distanceKm === null) {
    return "Distance unavailable";
  }
  return `${distanceKm.toFixed(1)} km away`;
};

const formatDuration = (clockInIso: string): string => {
  const elapsedMs = Date.now() - new Date(clockInIso).getTime();
  const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

export default function StaffHomeScreen() {
  const [sites, setSites] = useState<SiteWithDistance[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendanceResponse | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actingSiteId, setActingSiteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [, setTick] = useState<number>(0);
  const [photoModalSite, setPhotoModalSite] = useState<{ attendanceId: string; name: string } | null>(
    null
  );
  const [notesModalSiteId, setNotesModalSiteId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        showError("Location permission is required to clock in");
      }

      let coords: Coordinates | null = null;
      if (granted) {
        try {
          coords = await getCurrentLocation();
          setLocation(coords);
        } catch {
          showError("Unable to get current location");
        }
      }

      const [mySites, active] = await Promise.all([getMySites(), getActiveAttendance()]);

      const sitesWithDistance: SiteWithDistance[] = mySites.map((site) => ({
        ...site,
        distanceKm: coords
          ? calculateDistance(coords.latitude, coords.longitude, site.latitude, site.longitude)
          : null,
      }));

      sitesWithDistance.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });

      setSites(sitesWithDistance);
      setActiveAttendance(active);
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

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sites;
    }
    return sites.filter((site) => site.name.toLowerCase().includes(query));
  }, [sites, searchQuery]);

  const activeSiteId =
    activeAttendance?.active && activeAttendance.attendance
      ? activeAttendance.attendance.site_id
      : null;

  const handleClockIn = async (site: SiteWithDistance) => {
    if (!location) {
      showError("Current location is unavailable");
      return;
    }
    setActingSiteId(site.id);
    try {
      await clockIn(site.id, location.latitude, location.longitude);
      showSuccess(`Clocked in at ${site.name}`);
      await loadAll();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActingSiteId("");
    }
  };

  const handleClockOut = async (site: SiteWithDistance) => {
    if (!location) {
      showError("Current location is unavailable");
      return;
    }
    setActingSiteId(site.id);
    try {
      await clockOut(site.id, location.latitude, location.longitude);
      showSuccess(`Clocked out of ${site.name}`);
      await loadAll();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setActingSiteId("");
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
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      {activeAttendance?.active && activeAttendance.attendance ? (
        <View style={[styles.statusCard, styles.statusCardActive]}>
          <Text style={styles.statusCardText}>
            Clocked in at {activeAttendance.attendance.site?.name ?? "Unknown site"} ·{" "}
            {formatDuration(activeAttendance.attendance.clock_in)}
          </Text>
        </View>
      ) : (
        <View style={[styles.statusCard, styles.statusCardInactive]}>
          <Text style={styles.statusCardTextInactive}>Not clocked in</Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search sites..."
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-outline" size={18} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredSites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? "No sites found" : "No sites assigned to you."}
          </Text>
        }
        renderItem={({ item }) => {
          const isActiveSite = item.id === activeSiteId;
          const acting = actingSiteId === item.id;
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.address}</Text>
              <Text style={styles.distance}>{formatDistance(item.distanceKm)}</Text>

              {isActiveSite ? (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.clockOutButton}
                    onPress={() => handleClockOut(item)}
                    disabled={acting}
                  >
                    {acting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.clockOutButtonText}>Clock Out</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      if (activeAttendance?.attendance) {
                        setPhotoModalSite({
                          attendanceId: activeAttendance.attendance.id,
                          name: item.name,
                        });
                      }
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setNotesModalSiteId(item.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Notes</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[
                      styles.clockInButton,
                      !!activeAttendance?.active && styles.clockInButtonDisabled,
                    ]}
                    onPress={() => handleClockIn(item)}
                    disabled={!!activeAttendance?.active || acting}
                  >
                    {acting ? (
                      <ActivityIndicator color="#333" size="small" />
                    ) : (
                      <Text style={styles.clockInButtonText}>Clock In</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      <PhotoUploadModal
        visible={!!photoModalSite}
        attendanceId={photoModalSite?.attendanceId ?? null}
        siteName={photoModalSite?.name}
        onClose={() => setPhotoModalSite(null)}
      />

      <NotesModal
        visible={!!notesModalSiteId}
        siteId={notesModalSiteId}
        onClose={() => setNotesModalSiteId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  distance: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  clockInButton: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  clockInButtonDisabled: {
    opacity: 0.5,
  },
  clockInButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  clockOutButton: {
    flex: 1,
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  clockOutButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#e5e5e5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#333",
    fontWeight: "600",
  },
});
