import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAllStaff, Staff } from "../../src/services/staff.service";

export default function StaffScreen() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

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

      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !error ? <Text style={styles.emptyText}>No staff members found.</Text> : null
        }
        renderItem={({ item }) => (
          
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(admin)/staff/${item.profile_id}`)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.full_name}</Text>
              <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.badgeText}>{item.is_active ? "Active" : "Inactive"}</Text>
              </View>
            </View>
            <Text style={styles.detail}>{item.email}</Text>
            <Text style={styles.detail}>{item.phone}</Text>
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
});
