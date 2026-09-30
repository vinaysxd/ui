import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
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
  forceClockOut,
  ActiveAttendanceResponse,
} from "../../../src/services/attendance.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { ERRORS } from "../../../src/constants/errors";
import PhotoUploadModal from "../../../src/components/PhotoUploadModal";
import NotesModal from "../../../src/components/NotesModal";
import ConfirmModal from "../../../src/components/ConfirmModal";
import { COLORS, RADIUS } from "../../../src/constants/theme";
import ProcessingOverlay from "../../../src/components/ProcessingOverlay";
import { LOADING_STYLE } from "../../../src/constants/ui";

interface SiteWithDistance extends Site {
  distanceKm: number | null;
}

const formatDistance = (distanceKm: number | null, isLocating: boolean): string => {
  if (isLocating) {
    return "Getting location...";
  }
  if (distanceKm === null) {
    return "Distance unavailable";
  }
  return `${distanceKm.toFixed(1)} km away`;
};

const formatTimer = (totalSeconds: number): string => {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export default function StaffHomeScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendanceResponse | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actingSiteId, setActingSiteId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationPromiseRef = useRef<Promise<Coordinates> | null>(null);
  const [photoModalSite, setPhotoModalSite] = useState<{
    attendanceId: string;
    siteId: string;
  } | null>(null);
  const [notesModalSiteId, setNotesModalSiteId] = useState<string | null>(null);

  const [clockOutTargetSite, setClockOutTargetSite] = useState<SiteWithDistance | null>(null);
  const [clockOutModalVisible, setClockOutModalVisible] = useState<boolean>(false);
  const [clockOutModalLoading, setClockOutModalLoading] = useState<boolean>(false);
  const [outOfRangeModalVisible, setOutOfRangeModalVisible] = useState<boolean>(false);
  const [outOfRangeModalLoading, setOutOfRangeModalLoading] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setLocationLoading(true);

    // Location and site data are independent - fetch both concurrently and let
    // whichever resolves first update the screen, instead of making the site
    // list wait on a slow GPS fix.
    const locationTask = (async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          showError("Location permission is required to clock in");
          return;
        }
        const coords = await getCurrentLocation();
        setLocation(coords);
      } catch {
        showError("Unable to get current location");
      } finally {
        setLocationLoading(false);
      }
    })();

    const sitesTask = (async () => {
      try {
        const [mySites, active] = await Promise.all([getMySites(), getActiveAttendance()]);
        setSites(mySites);
        setActiveAttendance(active);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    })();

    await Promise.all([locationTask, sitesTask]);
  }, []);

  // Recomputed only when the raw site list or the cached location changes -
  // never triggers a location fetch itself.
  const sitesWithDistance: SiteWithDistance[] = useMemo(() => {
    const withDistance = sites.map((site) => ({
      ...site,
      distanceKm: location
        ? calculateDistance(location.latitude, location.longitude, site.latitude, site.longitude)
        : null,
    }));

    withDistance.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return withDistance;
  }, [sites, location]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!activeAttendance?.active || !activeAttendance.attendance) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedSeconds(0);
      return;
    }

    const clockInMs = new Date(activeAttendance.attendance.clock_in).getTime();
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - clockInMs) / 1000)));

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeAttendance?.active, activeAttendance?.attendance?.clock_in]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const activeSiteId =
    activeAttendance?.active && activeAttendance.attendance
      ? activeAttendance.attendance.site_id
      : null;

  const activeSite = useMemo(
    () => sitesWithDistance.find((site) => site.id === activeSiteId) ?? null,
    [sitesWithDistance, activeSiteId]
  );

  const otherSites = useMemo(
    () => sitesWithDistance.filter((site) => site.id !== activeSiteId),
    [sitesWithDistance, activeSiteId]
  );

  const filteredOtherSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return otherSites;
    }
    return otherSites.filter((site) => site.name.toLowerCase().includes(query));
  }, [otherSites, searchQuery]);

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

  const openClockOutModal = (site: SiteWithDistance) => {
    // Kick off a fresh GPS fix now so it's ready (or nearly ready) by the
    // time the user taps Confirm, instead of waiting for it after confirming.
    locationPromiseRef.current = getCurrentLocation();
    setClockOutTargetSite(site);
    setClockOutModalVisible(true);
  };

  const closeClockOutModal = () => {
    setClockOutModalVisible(false);
  };

  const closeOutOfRangeModal = () => {
    setOutOfRangeModalVisible(false);
  };

  const performClockOut = async () => {
    const site = clockOutTargetSite;
    if (!site) {
      return;
    }

    let resolvedLocation: Coordinates;
    try {
      resolvedLocation = locationPromiseRef.current
        ? await locationPromiseRef.current
        : await getCurrentLocation();
    } catch {
      showError("Unable to get current location");
      return;
    }

    const previousAttendance = activeAttendance;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
    setActiveAttendance(null);

    setClockOutModalLoading(true);
    try {
      await clockOut(site.id, resolvedLocation.latitude, resolvedLocation.longitude);
      setClockOutModalVisible(false);
      showSuccess(`Clocked out of ${site.name}`);
      await loadAll();
    } catch (err: any) {
      setActiveAttendance(previousAttendance);
      setClockOutModalVisible(false);
      if (err.message === ERRORS.ATTENDANCE_OUT_OF_RANGE.message) {
        setOutOfRangeModalVisible(true);
      } else {
        showError(err.message);
      }
    } finally {
      setClockOutModalLoading(false);
    }
  };

  const performForceClockOut = async () => {
    const site = clockOutTargetSite;
    if (!site) {
      return;
    }
    if (!location) {
      showError("Current location is unavailable");
      return;
    }

    const previousAttendance = activeAttendance;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSeconds(0);
    setActiveAttendance(null);

    setOutOfRangeModalLoading(true);
    try {
      await forceClockOut(site.id, location.latitude, location.longitude);
      setOutOfRangeModalVisible(false);
      showSuccess(`Clocked out of ${site.name}`);
      await loadAll();
    } catch (err: any) {
      setActiveAttendance(previousAttendance);
      showError(err.message);
    } finally {
      setOutOfRangeModalLoading(false);
    }
  };

  const retryClockOut = () => {
    // The previous location reading is what caused the out-of-range failure,
    // so grab a fresh fix rather than reusing the stale resolved promise.
    locationPromiseRef.current = getCurrentLocation();
    setOutOfRangeModalVisible(false);
    performClockOut();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const isClockedIn = !!activeAttendance?.active;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.gold} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search other sites..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList keyboardShouldPersistTaps="handled"
        data={filteredOtherSites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
            colors={[COLORS.gold]}
          />
        }
        ListHeaderComponent={
          <>
            {activeSite && activeAttendance?.attendance ? (
              <View style={styles.activeCard}>
                <Text style={styles.activeName}>{activeSite.name}</Text>
                <Text style={styles.activeDetail}>{activeSite.address}</Text>
                <Text style={styles.activeDistance}>
                  {formatDistance(activeSite.distanceKm, locationLoading)}
                </Text>

                <View style={styles.timerContainer}>
                  <Text style={styles.timerLabel}>CLOCKED IN</Text>
                  <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
                </View>

                <View style={styles.activeButtonRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openClockOutModal(activeSite)}
                  >
                    <LinearGradient
                      colors={["#EF4444", "#B91C1C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.clockOutButtonCompact}
                    >
                      <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.clockOutButtonText}>Clock Out</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.secondaryButtonCompact}
                    onPress={() => {
                      if (activeAttendance.attendance) {
                        setPhotoModalSite({
                          attendanceId: activeAttendance.attendance.id,
                          siteId: activeSite.id,
                        });
                      }
                    }}
                  >
                    <Ionicons name="images-outline" size={15} color={COLORS.gold} />
                    <Text style={styles.secondaryButtonText}>Photos</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.secondaryButtonCompact}
                    onPress={() => setNotesModalSiteId(activeSite.id)}
                  >
                    <Ionicons name="document-text-outline" size={15} color={COLORS.gold} />
                    <Text style={styles.secondaryButtonText}>Notes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {isClockedIn ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.otherSitesLabel}>
                  OTHER SITES ({filteredOtherSites.length})
                </Text>
              </>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? "No sites found" : "No sites assigned to you."}
          </Text>
        }
        renderItem={({ item }) => {
          const acting = actingSiteId === item.id;
          return (
            <View
              style={[styles.card, isClockedIn && styles.cardBlocked]}
              pointerEvents={isClockedIn ? "none" : "auto"}
            >
              <View style={styles.goldBar} />
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>{item.address}</Text>
              <Text style={styles.distance}>{formatDistance(item.distanceKm, locationLoading)}</Text>

              {isClockedIn ? (
                <Text style={styles.blockedText}>Clocked in elsewhere</Text>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.clockInButton, acting && LOADING_STYLE]}
                    onPress={() => handleClockIn(item)}
                    disabled={acting}
                  >
                    {acting ? (
                      <ActivityIndicator color="#1A1A1A" size="small" />
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
        siteId={photoModalSite?.siteId ?? null}
        onClose={() => setPhotoModalSite(null)}
      />

      <NotesModal
        visible={!!notesModalSiteId}
        siteId={notesModalSiteId}
        onClose={() => setNotesModalSiteId(null)}
      />
      <ProcessingOverlay visible={actingSiteId !== ""} />

      <ConfirmModal
        visible={clockOutModalVisible}
        title="Clock Out"
        message="Are you sure you want to clock out?"
        confirmText="Clock Out"
        confirmStyle="destructive"
        loading={clockOutModalLoading}
        onConfirm={performClockOut}
        onCancel={closeClockOutModal}
      />

      <ConfirmModal
        visible={outOfRangeModalVisible}
        title="Out of Range"
        message="You are not within 100 metres of the site."
        confirmText="Try Again"
        confirmStyle="default"
        loading={outOfRangeModalLoading}
        onConfirm={retryClockOut}
        onCancel={closeOutOfRangeModal}
        extraButton={{ text: "Force Clock Out", style: "destructive", onPress: performForceClockOut }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
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
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },
  activeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.35)",
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  activeName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  activeDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  activeDistance: {
    fontSize: 12,
    color: COLORS.gold,
    marginTop: 4,
  },
  timerContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  timerLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  timerText: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
    marginTop: 4,
  },
  clockOutButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    shadowColor: "#B91C1C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  clockOutButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
    marginTop: 4,
    marginBottom: 12,
  },
  otherSitesLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardBlocked: {
    opacity: 0.4,
  },
  blockedText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 12,
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
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  distance: {
    fontSize: 13,
    color: COLORS.gold,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  clockInButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  clockInButtonText: {
    color: "#1A1A1A",
    fontWeight: "600",
    fontSize: 14,
  },
  activeButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  secondaryButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  secondaryButtonText: {
    color: COLORS.gold,
    fontWeight: "600",
    fontSize: 13,
  },
});
