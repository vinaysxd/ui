import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
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
import api from "../../../src/lib/api";
import { getErrorMessage } from "../../../src/constants/errors";
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import ScreenContainer from "../../../src/components/ScreenContainer";
import ConfirmModal from "../../../src/components/ConfirmModal";
import SitesTable from "../../../src/components/admin/SitesTable";
import EmptyState from "../../../src/components/EmptyState";
import { LOADING_STYLE } from "../../../src/constants/ui";
import Loader from "../../../src/components/Loader";

interface QBCustomerResult {
  qb_customer_id: string;
  name: string;
  email?: string;
}

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

const capitalise = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Collapse stray whitespace/newlines so multi-line addresses read as one clean line.
const tidy = (s?: string | null): string => (s ?? "").replace(/\s*\n+\s*/g, ", ").replace(/\s{2,}/g, " ").trim();

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

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
  const [deactivateModalVisible, setDeactivateModalVisible] = useState<boolean>(false);

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState<boolean>(false);
  const [sitesLoaded, setSitesLoaded] = useState<boolean>(false);

  const [qbCustomerId, setQbCustomerId] = useState<string | null>(null);
  const [qbCustomerName, setQbCustomerName] = useState<string | null>(null);
  const [qbSearchQuery, setQbSearchQuery] = useState<string>("");
  const [qbSearchResults, setQbSearchResults] = useState<QBCustomerResult[]>([]);
  const [qbSearching, setQbSearching] = useState<boolean>(false);
  const [qbLinking, setQbLinking] = useState<boolean>(false);
  const [qbUnlinking, setQbUnlinking] = useState<boolean>(false);

  const applyFields = (data: Client) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAvatarUrl(data.avatar_url ?? "");
    setCompanyName(data.company_name ?? "");
    setBillingAddress(tidy(data.billing_address));
    setContactPerson(data.contact_person ?? "");
    setQbCustomerId((data as any).qb_customer_id ?? null);
    setQbCustomerName((data as any).qb_customer_name ?? null);
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

  useEffect(() => {
    if (qbCustomerId || !qbSearchQuery.trim()) {
      setQbSearchResults([]);
      setQbSearching(false);
      return;
    }

    setQbSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await api.get("/integrations/quickbooks/customers/search", {
          params: { name: qbSearchQuery.trim() },
        });
        setQbSearchResults(response.data ?? []);
      } catch (err: any) {
        const code = err?.response?.data?.code;
        showError(getErrorMessage(code));
      } finally {
        setQbSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [qbSearchQuery, qbCustomerId]);

  const handleLinkCustomer = async (customer: QBCustomerResult) => {
    setQbLinking(true);
    try {
      await api.patch(`/integrations/quickbooks/clients/${id}/link`, {
        qb_customer_id: customer.qb_customer_id,
      });
      setQbCustomerId(customer.qb_customer_id);
      setQbCustomerName(customer.name);
      setQbSearchQuery("");
      setQbSearchResults([]);
      showSuccess("QuickBooks customer linked successfully");
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(getErrorMessage(code));
    } finally {
      setQbLinking(false);
    }
  };

  const handleUnlinkCustomer = async () => {
    setQbUnlinking(true);
    try {
      await api.patch(`/integrations/quickbooks/clients/${id}/link`, {
        qb_customer_id: null,
      });
      setQbCustomerId(null);
      setQbCustomerName(null);
      showSuccess("QuickBooks customer unlinked");
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(getErrorMessage(code));
    } finally {
      setQbUnlinking(false);
    }
  };

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
      setDeactivateModalVisible(false);
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
        <Loader size="large" />
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

  const field = (key: string) => ({
    focused: focusedField === key,
    onFocus: () => setFocusedField(key),
    onBlur: () => setFocusedField(null),
  });

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.inner}>
            <BackButton onPress={() => router.replace("/(admin)/clients")} />

            <View style={styles.header}>
              {client.avatar_url && !avatarFailed ? (
                <Image
                  source={{ uri: client.avatar_url }}
                  style={styles.avatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initialsOf(client.full_name)}</Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.name} numberOfLines={2}>
                  {client.full_name}
                </Text>
                <Text style={styles.subtitle}>{client.company_name || client.email}</Text>
              </View>
              <View style={[styles.badge, client.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <View style={[styles.badgeDot, { backgroundColor: client.is_active ? COLORS.success : COLORS.dangerText }]} />
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
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          <View style={styles.inner}>
            {activeTab === "details" && (
              <>
                <View style={styles.panel}>
                  <SectionHeading title="Contact Information" first />
                  <Field
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    editing={isEditing}
                    placeholder="Full name"
                    {...field("fullName")}
                  />
                  <Field label="Email" value={client.email} />
                  <Field
                    label="Phone"
                    value={phone}
                    onChangeText={setPhone}
                    editing={isEditing}
                    keyboardType="phone-pad"
                    placeholder="e.g. 0412 345 678"
                    {...field("phone")}
                  />
                  <Field
                    label="Contact Person"
                    value={contactPerson}
                    onChangeText={setContactPerson}
                    editing={isEditing}
                    placeholder="Primary contact"
                    {...field("contactPerson")}
                  />

                  <SectionHeading title="Company" />
                  <Field
                    label="Company Name"
                    value={companyName}
                    onChangeText={setCompanyName}
                    editing={isEditing}
                    placeholder="Company name"
                    {...field("companyName")}
                  />
                  <Field
                    label="Billing Address"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    editing={isEditing}
                    placeholder="Street, suburb"
                    {...field("billingAddress")}
                  />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Role</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{capitalise(client.role)}</Text>
                    </View>
                  </View>
                  <Field label="Joined" value={client.created_at ? formatDate(client.created_at) : ""} />

                  <SectionHeading title="QuickBooks" />
                  {qbCustomerId ? (
                    <View style={styles.qbLinkedRow}>
                      <View style={styles.qbLinkedInfo}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                        <Text style={styles.qbLinkedText} numberOfLines={1}>
                          Linked: {qbCustomerName ?? qbCustomerId}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.textButton, qbUnlinking && LOADING_STYLE]}
                        onPress={handleUnlinkCustomer}
                        disabled={qbUnlinking}
                      >
                        {qbUnlinking ? <Loader tone="danger" /> : <Text style={styles.dangerText}>Unlink</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <TextInput
                        style={[styles.input, focusedField === "qb" && styles.inputFocused]}
                        value={qbSearchQuery}
                        onChangeText={setQbSearchQuery}
                        onFocus={() => setFocusedField("qb")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Search QuickBooks customer by name"
                        placeholderTextColor={COLORS.textMuted}
                      />

                      {qbSearching ? (
                        <Loader style={styles.qbSearchLoading} />
                      ) : qbSearchResults.length > 0 ? (
                        <View style={styles.qbDropdown}>
                          {qbSearchResults.map((customer) => (
                            <TouchableOpacity
                              key={customer.qb_customer_id}
                              style={[styles.qbDropdownItem, qbLinking && LOADING_STYLE]}
                              onPress={() => handleLinkCustomer(customer)}
                              disabled={qbLinking}
                            >
                              <Text style={styles.qbDropdownName}>{customer.name}</Text>
                              {customer.email ? (
                                <Text style={styles.qbDropdownEmail}>{customer.email}</Text>
                              ) : null}
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : qbSearchQuery.trim().length > 0 ? (
                        <Text style={styles.qbEmptyText}>No matching QuickBooks customers</Text>
                      ) : null}
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  {isEditing ? (
                    <>
                      <TouchableOpacity
                        style={[styles.primaryButton, saving && LOADING_STYLE]}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        {saving ? <Loader tone="dark" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryButton, saving && LOADING_STYLE]}
                        onPress={handleCancel}
                        disabled={saving}
                      >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.primaryButton} onPress={handleEdit}>
                        <Ionicons name="create-outline" size={16} color="#1A1A1A" />
                        <Text style={styles.primaryButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1 }} />
                      {client.is_active ? (
                        <TouchableOpacity style={styles.textButton} onPress={() => setDeactivateModalVisible(true)}>
                          <Text style={styles.dangerText}>Deactivate</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.textButton, reactivating && LOADING_STYLE]}
                          onPress={handleReactivate}
                          disabled={reactivating}
                        >
                          {reactivating ? <Loader /> : <Text style={styles.successText}>Reactivate</Text>}
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>
            )}

            {activeTab === "sites" && (
              <>
                {sitesLoading ? (
                  <Loader style={styles.sitesLoading} />
                ) : assignedSites.length === 0 ? (
                  <EmptyState
                    icon="business-outline"
                    title="No sites assigned"
                    hint="Sites linked to this client will show up here."
                  />
                ) : (
                  <SitesTable sites={assignedSites} showStatus />
                )}
              </>
            )}
          </View>
        </ScrollView>

        <ConfirmModal
          visible={deactivateModalVisible}
          title="Deactivate Client"
          message={`Are you sure you want to deactivate ${client.full_name}?`}
          confirmText="Deactivate"
          confirmStyle="destructive"
          loading={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateModalVisible(false)}
        />
      </View>
    </ScreenContainer>
  );
}

function SectionHeading({ title, first }: { title: string; first?: boolean }) {
  return <Text style={[styles.sectionHeading, first && { marginTop: 0 }]}>{title}</Text>;
}

// Read-only row (label left, value left-aligned in a fixed column) that turns into a
// labelled input while `editing`. Fields without `onChangeText` are never editable.
function Field({
  label,
  value,
  onChangeText,
  editing,
  placeholder,
  keyboardType,
  focused,
  onFocus,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editing?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad";
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  if (editing && onChangeText) {
    return (
      <View style={styles.editField}>
        <Text style={styles.editLabel}>{label}</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
        />
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, !value && styles.rowValueEmpty]} selectable>
        {value || "—"}
      </Text>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="arrow-back" size={18} color={COLORS.gold} />
      <Text style={styles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    width: "100%",
    maxWidth: 880,
    alignSelf: "center",
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 24,
    backgroundColor: COLORS.surface,
  },
  tabBar: {
    flexDirection: "row",
    marginTop: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
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
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 18,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.gold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
  },
  avatarFallback: {
    backgroundColor: COLORS.goldTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "700",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeActive: {
    backgroundColor: `${COLORS.success}38`,
  },
  badgeInactive: {
    backgroundColor: `${COLORS.dangerText}38`,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: COLORS.success,
  },
  badgeTextInactive: {
    color: COLORS.dangerText,
  },
  panel: {
    backgroundColor: COLORS.foreground,
    ...SHADOW.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 24,
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLORS.gold,
    marginTop: 28,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  rowLabel: {
    width: 130,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  rowValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  rowValueEmpty: {
    color: COLORS.textMuted,
    fontWeight: "400",
  },
  roleBadge: {
    backgroundColor: COLORS.hover,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  roleBadgeText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  editField: {
    marginBottom: 14,
    marginTop: 4,
  },
  editLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  input: {
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardHigh,
    ...SHADOW.card,
    color: COLORS.textPrimary,
    fontSize: 15,
    outlineStyle: "none",
  } as any,
  inputFocused: {
    backgroundColor: COLORS.accentBg,
  },
  qbLinkedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  qbLinkedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  qbLinkedText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  qbSearchLoading: {
    marginTop: 12,
  },
  qbDropdown: {
    marginTop: 8,
    ...SHADOW.card,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardHigh,
    overflow: "hidden",
  },
  qbDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  qbDropdownName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  qbDropdownEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  qbEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 120,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
  },
  primaryButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryButton: {
    height: 44,
    paddingHorizontal: 22,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.hover,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  textButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dangerText: {
    color: COLORS.dangerText,
    fontWeight: "600",
    fontSize: 14,
  },
  successText: {
    color: COLORS.success,
    fontWeight: "600",
    fontSize: 14,
  },
  sitesLoading: {
    marginTop: 16,
  },
  card: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    ...SHADOW.card,
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
