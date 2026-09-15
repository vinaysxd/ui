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
  Animated,
  LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAllClients, Client } from "../../../src/services/client.service";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

const COLUMN_FLEX = { name: 2, email: 2, phone: 1.3, company: 1.7, status: 1 };

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function ClientsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [expanded, setExpanded] = useState<boolean>(false);
  const [inactiveContentHeight, setInactiveContentHeight] = useState<number>(0);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedRotate = useRef(new Animated.Value(0)).current;

  const fetchClients = useCallback(async () => {
    try {
      const data = await getAllClients();
      setClients(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const activeClients = useMemo(() => clients.filter((client) => client.is_active), [clients]);
  const inactiveClients = useMemo(() => clients.filter((client) => !client.is_active), [clients]);

  const filteredActiveClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return activeClients;
    }
    return activeClients.filter((client) =>
      [client.full_name, client.email, client.phone].some((field) =>
        field?.toLowerCase().includes(query)
      )
    );
  }, [activeClients, searchQuery]);

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animatedHeight, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
    Animated.timing(animatedRotate, {
      toValue,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const handleInactiveContentLayout = (event: LayoutChangeEvent) => {
    setInactiveContentHeight(event.nativeEvent.layout.height);
  };

  const rotateStyle = {
    transform: [
      {
        rotate: animatedRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "180deg"],
        }),
      },
    ],
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
        <Text style={styles.eyebrow}>CLIENTS</Text>
        <Text style={styles.title}>Team Clients</Text>
      </View>
      <TouchableOpacity style={styles.inviteButton} onPress={() => router.push("/(admin)/clients/invite")}>
        <Ionicons name="person-add-outline" size={16} color="#1A1A1A" />
        <Text style={styles.inviteButtonText}>Invite Client</Text>
      </TouchableOpacity>
    </View>
  );

  const searchBar = (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={18} color={COLORS.gold} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search active clients..."
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
      />
      {searchQuery.length > 0 ? (
        <TouchableOpacity onPress={() => setSearchQuery("")}>
          <Ionicons name="close-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const emptyText = (
    <Text style={styles.emptyText}>
      {searchQuery.trim()
        ? "No clients found"
        : clients.length === 0
        ? "No clients found."
        : "No active clients."}
    </Text>
  );

  const deactivatedAccordion =
    inactiveClients.length > 0 ? (
      <View style={styles.accordionContainer}>
        <TouchableOpacity style={styles.accordionHeader} onPress={toggleExpanded}>
          <Text style={styles.accordionHeaderText}>Deactivated Clients ({inactiveClients.length})</Text>
          <Animated.View style={rotateStyle}>
            <Ionicons name="chevron-down-outline" size={20} color={COLORS.gold} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.accordionBody,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, inactiveContentHeight],
              }),
            },
          ]}
        >
          <View onLayout={handleInactiveContentLayout} style={styles.accordionInner}>
            {inactiveClients.map((item) =>
              isDesktop ? (
                <ClientTableRow key={item.id} item={item} onPress={() => router.push(`/(admin)/clients/${item.profile_id}`)} inactive />
              ) : (
                <ClientCard key={item.id} item={item} onPress={() => router.push(`/(admin)/clients/${item.profile_id}`)} inactive />
              )
            )}
          </View>
        </Animated.View>
      </View>
    ) : null;

  if (isDesktop) {
    return (
      <LinearGradient colors={["#1A1A1A", "#0D0D0D"]} style={styles.desktopScreen}>
        <View style={styles.desktopCard}>
          <FlatList
            data={filteredActiveClients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.webContent}
            ListHeaderComponent={
              <View style={styles.maxWidthWrap}>
                {header}
                {searchBar}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { flex: COLUMN_FLEX.name }]}>Name</Text>
                  <Text style={[styles.th, { flex: COLUMN_FLEX.email }]}>Email</Text>
                  <Text style={[styles.th, { flex: COLUMN_FLEX.phone }]}>Phone</Text>
                  <Text style={[styles.th, { flex: COLUMN_FLEX.company }]}>Company</Text>
                  <Text style={[styles.th, { flex: COLUMN_FLEX.status }]}>Status</Text>
                </View>
              </View>
            }
            ListEmptyComponent={<View style={styles.maxWidthWrap}>{emptyText}</View>}
            renderItem={({ item }) => (
              <View style={styles.maxWidthWrap}>
                <ClientTableRow item={item} onPress={() => router.push(`/(admin)/clients/${item.profile_id}`)} />
              </View>
            )}
            ListFooterComponent={<View style={styles.maxWidthWrap}>{deactivatedAccordion}</View>}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.mobileScreen}>
      <View style={styles.mobileHeaderWrap}>
        {header}
        {searchBar}
      </View>

      <FlatList
        data={filteredActiveClients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.mobileContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}
        ListEmptyComponent={emptyText}
        renderItem={({ item }) => (
          <ClientCard item={item} onPress={() => router.push(`/(admin)/clients/${item.profile_id}`)} />
        )}
        ListFooterComponent={deactivatedAccordion}
      />
    </View>
  );
}

function ClientCard({ item, onPress, inactive }: { item: Client; onPress: () => void; inactive?: boolean }) {
  return (
    <TouchableOpacity style={[styles.card, inactive && styles.cardInactive]} onPress={onPress}>
      <View style={styles.goldBar} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        {item.company_name ? <Text style={styles.company}>{item.company_name}</Text> : null}
      </View>
      <View style={[styles.badge, inactive ? styles.badgeInactive : styles.badgeActive]}>
        <Text style={[styles.badgeText, inactive ? styles.badgeTextInactive : styles.badgeTextActive]}>
          {inactive ? "Inactive" : "Active"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

function ClientTableRow({ item, onPress, inactive }: { item: Client; onPress: () => void; inactive?: boolean }) {
  return (
    <TouchableOpacity style={styles.tableRow} onPress={onPress}>
      <View style={[styles.tableNameCell, { flex: COLUMN_FLEX.name }]}>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>{getInitials(item.full_name)}</Text>
        </View>
        <Text style={styles.name}>{item.full_name}</Text>
      </View>
      <Text style={[styles.email, { flex: COLUMN_FLEX.email }]}>{item.email}</Text>
      <Text style={[styles.phone, { flex: COLUMN_FLEX.phone }]}>{item.phone}</Text>
      <Text style={[styles.company, { flex: COLUMN_FLEX.company }]}>{item.company_name ?? "—"}</Text>
      <View style={{ flex: COLUMN_FLEX.status }}>
        <View style={[styles.badge, inactive ? styles.badgeInactive : styles.badgeActive]}>
          <Text style={[styles.badgeText, inactive ? styles.badgeTextInactive : styles.badgeTextActive]}>
            {inactive ? "Inactive" : "Active"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  inviteButtonText: {
    color: "#1A1A1A",
    fontSize: 14,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    color: COLORS.textPrimary,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 32,
  },

  // Card (mobile + accordion fallback)
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    gap: 12,
  },
  cardInactive: {
    backgroundColor: COLORS.surface,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  phone: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  company: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  badgeActive: {
    backgroundColor: COLORS.successBg,
  },
  badgeInactive: {
    backgroundColor: COLORS.border,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgeTextActive: {
    color: COLORS.success,
  },
  badgeTextInactive: {
    color: COLORS.textMuted,
  },
  chevron: {
    marginLeft: 4,
  },

  accordionContainer: {
    marginTop: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 16,
  },
  accordionHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  accordionBody: {
    overflow: "hidden",
  },
  accordionInner: {
    paddingTop: 12,
  },

  // Web: floating dark card on gradient background
  desktopScreen: {
    flex: 1,
  },
  desktopCard: {
    flex: 1,
    margin: 24, 
    borderRadius: RADIUS.xl,
    
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
  mobileScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mobileContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Table (web)
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
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableNameCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSmallText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "700",
  },
});
