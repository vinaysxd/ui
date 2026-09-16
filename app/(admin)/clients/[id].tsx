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
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState<boolean>(false);
  const [sitesLoaded, setSitesLoaded] = useState<boolean>(false);

  const applyFields = (data: Client) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAvatarUrl(data.avatar_url ?? "");
    setCompanyName(data.company_name ?? "");
    setBillingAddress(data.billing_address ?? "");
    setContactPerson(data.contact_person ?? "");
  };

  const fetchClient = useCallback(async () => {
    try {
      const data = await getClient(id);
      setClient(data);
      applyFields(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const fetchSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const allSites = await getAllSites();
      const filtered = allSites.filter((site) => site.client_id === client?.id);
      setAssignedSites(filtered);
      setSitesLoaded(true);
    } catch (err: any) {
      showError(err.message);
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
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (client) {
      applyFields(client);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
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
      showSuccess("Client details saved");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateClient(id);
      await fetchClient();
      showSuccess("Client deactivated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await reactivateClient(id);
      await fetchClient();
      showSuccess("Client reactivated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.replace("/(admin)/clients")} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.replace("/(admin)/clients")} />

        <View style={styles.header}>
          <Text style={styles.name}>{client.full_name}</Text>
          <View style={[styles.badge, client.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, client.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {client.is_active ? "Active" : "Inactive"}
            </Text>
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
        {activeTab === "details" && (
          <>
            <View style={styles.section}>
              <Row label="Email" value={client.email} />
              <FieldInput
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                editable={isEditing}
                focused={focusedField === "fullName"}
                onFocus={() => setFocusedField("fullName")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
                focused={focusedField === "phone"}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
              />
              <Row label="Role" value={client.role} />
              <FieldInput
                label="Avatar URL"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                editable={isEditing}
                focused={focusedField === "avatarUrl"}
                onFocus={() => setFocusedField("avatarUrl")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
                editable={isEditing}
                focused={focusedField === "companyName"}
                onFocus={() => setFocusedField("companyName")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Billing Address"
                value={billingAddress}
                onChangeText={setBillingAddress}
                editable={isEditing}
                focused={focusedField === "billingAddress"}
                onFocus={() => setFocusedField("billingAddress")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Contact Person"
                value={contactPerson}
                onChangeText={setContactPerson}
                editable={isEditing}
                focused={focusedField === "contactPerson"}
                onFocus={() => setFocusedField("contactPerson")}
                onBlur={() => setFocusedField(null)}
              />
              <Row label="Joined" value={client.created_at ? formatDate(client.created_at) : "—"} />
            </View>

            {isEditing ? (
              <>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#1A1A1A" />
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
                      <ActivityIndicator color={COLORS.danger} />
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
                      <ActivityIndicator color={COLORS.success} />
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
            {sitesLoading ? (
              <ActivityIndicator style={styles.sitesLoading} color={COLORS.gold} />
            ) : assignedSites.length === 0 ? (
              <Text style={styles.emptyText}>No sites assigned</Text>
            ) : (
              assignedSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.card}
                  onPress={() => router.push(`/(admin)/sites/${site.id}`)}
                >
                  <View style={styles.goldBar} />
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{site.name}</Text>
                    <View
                      style={[styles.badge, site.is_active ? styles.badgeActive : styles.badgeInactive]}
                    >
                      <Text style={[styles.badgeText, site.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                        {site.is_active ? "Active" : "Inactive"}
                      </Text>
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
  focused,
  onFocus,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable: boolean;
  keyboardType?: "default" | "phone-pad";
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="arrow-back" size={20} color={COLORS.gold} />
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    borderBottomColor: COLORS.gold,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.gold,
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
    backgroundColor: COLORS.background,
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
    color: COLORS.gold,
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
    color: COLORS.textPrimary,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeActive: {
    backgroundColor: COLORS.successBg,
  },
  badgeInactive: {
    backgroundColor: COLORS.dangerBg,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextActive: {
    color: COLORS.success,
  },
  badgeTextInactive: {
    color: COLORS.danger,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 16,
    color: COLORS.textPrimary,
  },
  fieldRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 6,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  inputDisabled: {
    borderColor: "transparent",
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textMuted,
    fontWeight: "normal",
  },
  inputFocused: {
    borderColor: COLORS.gold,
  },
  editButton: {
    backgroundColor: COLORS.gold,
    height: 52,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginBottom: 12,
  },
  editButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: COLORS.gold,
    height: 52,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginBottom: 12,
  },
  saveButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
  cancelButton: {
    height: 48,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  deactivateButton: {
    backgroundColor: COLORS.dangerBg,
    height: 52,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  deactivateButtonText: {
    color: COLORS.danger,
    fontWeight: "bold",
  },
  reactivateButton: {
    backgroundColor: COLORS.successBg,
    height: 52,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  reactivateButtonText: {
    color: COLORS.success,
    fontWeight: "bold",
  },
  sitesLoading: {
    marginTop: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 19,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  detail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
