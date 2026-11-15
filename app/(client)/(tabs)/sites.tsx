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
import { getClientSite, getClientSites, Site } from "../../../src/services/sites.service";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import Skeleton from "../../../src/components/Skeleton";
import EmptyState from "../../../src/components/EmptyState";
import { ActivePill } from "../../../src/components/admin/DirectoryScreen";

export default function ClientSitesScreen() {
  const router = useRouter();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadSites = useCallback(async () => {
    try {
      const data = await getClientSites();
      // The list endpoint may omit assigned staff; fall back to the detail endpoint.
      const withStaff = await Promise.all(
        data.map(async (site) => {
          if (site.staff) {
            return site;
          }
          try {
            const detail = await getClientSite(site.id);
            return { ...site, staff: detail.staff ?? [] };
          } catch {
            return site;
          }
        })
      );
      setSites(withStaff);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSites();
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
        {sites.length} {sites.length === 1 ? "site" : "sites"}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <EmptyState
              icon="search-outline"
              title="No sites match your search"
              actionLabel="Clear search"
              onAction={() => setSearchQuery("")}
            />
          ) : (
            <EmptyState icon="business-outline" title="No sites yet" hint="Sites linked to your account will appear here." />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(client)/site/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <ActivePill active={item.is_active} />
            </View>
            <Text style={styles.detail}>{item.address}</Text>
            <View style={styles.staffRow}>
              <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.staffText} numberOfLines={2}>
                {item.staff && item.staff.length > 0
                  ? item.staff.map((member) => member.full_name).join(", ")
                  : "No staff assigned"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  staffText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
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
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 8,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
