import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistance,
  Coordinates,
} from "../../../src/services/location.service";
import { getMySites, Site } from "../../../src/services/sites.service";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import Skeleton from "../../../src/components/Skeleton";
import EmptyState from "../../../src/components/EmptyState";

interface SiteWithDistance extends Site {
  distanceKm: number | null;
}

const formatDistance = (distanceKm: number | null): string => {
  if (distanceKm === null) {
    return "Distance unavailable";
  }
  return `${distanceKm.toFixed(1)} km away`;
};

export default function StaffSitesScreen() {
  const router = useRouter();

  const [sites, setSites] = useState<SiteWithDistance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadAll = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();

      let coords: Coordinates | null = null;
      if (granted) {
        try {
          coords = await getCurrentLocation();
        } catch {
          showError("Unable to get current location");
        }
      }

      const mySites = await getMySites();

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

  const filteredSites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sites;
    }
    return sites.filter(
      (site) =>
        site.name.toLowerCase().includes(query) || site.address.toLowerCase().includes(query)
    );
  }, [sites, searchQuery]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Skeleton width={140} height={24} style={{ marginBottom: 8 }} />
        <Skeleton width={90} height={13} style={{ marginBottom: 20 }} />
        <Skeleton height={42} radius={RADIUS.md} style={{ marginBottom: 16 }} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={84} radius={RADIUS.md} style={{ marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sites</Text>
      <Text style={styles.subtitle}>
        {sites.length} assigned {sites.length === 1 ? "site" : "sites"} · nearest first
      </Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or address..."
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList keyboardShouldPersistTaps="handled"
        data={filteredSites}
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
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState
              icon="search-outline"
              title="No sites match your search"
              actionLabel="Clear search"
              onAction={() => setSearchQuery("")}
            />
          ) : (
            <EmptyState icon="business-outline" title="No sites assigned" hint="Ask an admin to assign you to a site." />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(staff)/site/${item.id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>{item.address}</Text>
            <Text style={styles.distance}>{formatDistance(item.distanceKm)}</Text>
          </TouchableOpacity>
        )}
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
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.foreground,
    ...SHADOW.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    color: COLORS.textPrimary,
    outlineStyle: "none",
  } as any,
  listContent: {
    paddingBottom: 32,
  },
  card: {
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
});
