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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAllStaff, Staff } from "../../../src/services/staff.service";

export default function StaffScreen() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [expanded, setExpanded] = useState<boolean>(false);
  const [inactiveContentHeight, setInactiveContentHeight] = useState<number>(0);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedRotate = useRef(new Animated.Value(0)).current;

  const fetchStaff = useCallback(async () => {
    setError("");
    try {
      const data = await getAllStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const activeStaff = useMemo(() => staff.filter((member) => member.is_active), [staff]);
  const inactiveStaff = useMemo(() => staff.filter((member) => !member.is_active), [staff]);

  const filteredActiveStaff = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return activeStaff;
    }
    return activeStaff.filter((member) =>
      [member.full_name, member.email, member.phone].some((field) =>
        field?.toLowerCase().includes(query)
      )
    );
  }, [activeStaff, searchQuery]);

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => router.push("/(admin)/staff/invite")}
        >
          <Ionicons name="person-add-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search active staff..."
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
        data={filteredActiveStaff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !error ? (
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? "No staff found"
                : staff.length === 0
                ? "No staff members found."
                : "No active staff members."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(admin)/staff/${item.profile_id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.full_name}</Text>
              <View style={[styles.badge, styles.badgeActive]}>
                <Text style={styles.badgeText}>Active</Text>
              </View>
            </View>
            <Text style={styles.detail}>{item.email}</Text>
            <Text style={styles.detail}>{item.phone}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          inactiveStaff.length > 0 ? (
            <View style={styles.accordionContainer}>
              <TouchableOpacity style={styles.accordionHeader} onPress={toggleExpanded}>
                <Text style={styles.accordionHeaderText}>
                  Deactivated Staff ({inactiveStaff.length})
                </Text>
                <Animated.View style={rotateStyle}>
                  <Ionicons name="chevron-down-outline" size={20} color="#000" />
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
                  {inactiveStaff.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.card, styles.inactiveCard]}
                      onPress={() => router.push(`/(admin)/staff/${item.profile_id}`)}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={styles.name}>{item.full_name}</Text>
                        <View style={[styles.badge, styles.badgeInactive]}>
                          <Text style={styles.badgeText}>Inactive</Text>
                        </View>
                      </View>
                      <Text style={styles.detail}>{item.email}</Text>
                      <Text style={styles.detail}>{item.phone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </View>
          ) : null
        }
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
  inviteButton: {
    backgroundColor: "#000",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
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
  inactiveCard: {
    backgroundColor: "#e5e5e5",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
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
  badge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeActive: {
    backgroundColor: "#16a34a",
  },
  badgeInactive: {
    backgroundColor: "#dc2626",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  accordionContainer: {
    marginTop: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eeeeee",
    borderRadius: 8,
    padding: 16,
  },
  accordionHeaderText: {
    fontSize: 15,
    fontWeight: "600",
  },
  accordionBody: {
    overflow: "hidden",
  },
  accordionInner: {
    paddingTop: 12,
  },
});
