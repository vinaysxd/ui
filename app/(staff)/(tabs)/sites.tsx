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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sites</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or address..."
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
});
