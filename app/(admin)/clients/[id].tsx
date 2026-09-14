import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getClient,
  updateClient,
  deactivateClient,
  reactivateClient,
  Client,
} from "../../../src/services/client.service";
import { getAllSites, Site } from "../../../src/services/sites.service";

type Tab = "details" | "sites";

const TABS: { key: Tab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "sites", label: "Sites" },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const [client, setClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState<boolean>(false);
  const [sitesLoaded, setSitesLoaded] = useState<boolean>(false);
  const [sitesError, setSitesError] = useState<string>("");

  const applyFields = (data: Client) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAvatarUrl(data.avatar_url ?? "");
    setCompanyName(data.company_name ?? "");
    setBillingAddress(data.billing_address ?? "");
    setContactPerson(data.contact_person ?? "");
  };

  const fetchClient = useCallback(async () => {
    setError("");
    try {
      const data = await getClient(id);
      setClient(data);
      applyFields(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const fetchSites = useCallback(async () => {
    setSitesError("");
    setSitesLoading(true);
    try {
      const allSites = await getAllSites();
      const filtered = allSites.filter((site) => site.client_id === client?.id);
      setAssignedSites(filtered);
      setSitesLoaded(true);
    } catch (err: any) {
      setSitesError(err.message);
    } finally {
      setSitesLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (activeTab === "sites" && !sitesLoaded) {
      fetchSites();
    }
  }, [activeTab, sitesLoaded, fetchSites]);

  const handleEdit = () => {
    setError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (client) {
      applyFields(client);
    }
    setError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await updateClient(id, {
        full_name: fullName,
        phone,
        avatar_url: avatarUrl,
        company_name: companyName,
        billing_address: billingAddress,
        contact_person: contactPerson,
      });
      setClient(updated);
      applyFields(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setError("");
    try {
      await deactivateClient(id);
      await fetchClient();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    setError("");
    try {
      await reactivateClient(id);
      await fetchClient();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !client) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.header}>
          <Text style={styles.name}>{client.full_name}</Text>
          <View style={[styles.badge, client.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{client.is_active ? "Active" : "Inactive"}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {activeTab === "details" && (
          <>
            <View style={styles.section}>
              <Row label="Email" value={client.email} />
              <FieldInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                editable={isEditing}
              />
              <FieldInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
              />
              <Row label="Role" value={client.role} />
              <FieldInput
                label="Avatar URL"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                editable={isEditing}
              />
              <FieldInput
                label="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
                editable={isEditing}
              />
              <FieldInput
                label="Billing Address"
                value={billingAddress}
                onChangeText={setBillingAddress}
                editable={isEditing}
              />
              <FieldInput
                label="Contact Person"
                value={contactPerson}
                onChangeText={setContactPerson}
                editable={isEditing}
              />
              <Row label="Joined" value={client.created_at ? formatDate(client.created_at) : "—"} />
            </View>

            {isEditing ? (
              <>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                {client.is_active ? (
                  <TouchableOpacity
                    style={styles.deactivateButton}
                    onPress={handleDeactivate}
                    disabled={deactivating}
                  >
                    {deactivating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.deactivateButtonText}>Deactivate</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.reactivateButton}
                    onPress={handleReactivate}
                    disabled={reactivating}
                  >
                    {reactivating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.reactivateButtonText}>Reactivate</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        {activeTab === "sites" && (
          <>
            {sitesError ? <Text style={styles.errorText}>{sitesError}</Text> : null}
            {sitesLoading ? (
              <ActivityIndicator style={styles.sitesLoading} />
            ) : assignedSites.length === 0 ? (
              <Text style={styles.emptyText}>No sites assigned</Text>
            ) : (
              assignedSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.card}
                  onPress={() => router.push(`/(admin)/sites/${site.id}`)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{site.name}</Text>
                    <View
                      style={[styles.badge, site.is_active ? styles.badgeActive : styles.badgeInactive]}
                    >
                      <Text style={styles.badgeText}>{site.is_active ? "Active" : "Inactive"}</Text>
                    </View>
                  </View>
                  <Text style={styles.detail}>{site.address}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
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

function FieldInput({
  label,
  value,
  onChangeText,
  editable,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable: boolean;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
      />
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
  errorText: {
    color: "red",
    marginBottom: 16,
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
  badgeInactive: {
    backgroundColor: "#dc2626",
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
    marginBottom: 24,
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
  fieldRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  inputDisabled: {
    borderColor: "transparent",
    backgroundColor: "#f5f5f5",
    color: "#666",
    fontWeight: "normal",
  },
  editButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  deactivateButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  deactivateButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  reactivateButton: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  reactivateButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  sitesLoading: {
    marginTop: 16,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 16,
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
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
});
