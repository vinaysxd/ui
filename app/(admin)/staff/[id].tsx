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
  getStaff,
  updateStaff,
  deactivateStaff,
  reactivateStaff,
  Staff,
} from "../../../src/services/staff.service";
import { getAllSites, getSiteStaff, Site } from "../../../src/services/sites.service";
import { getAttendanceBySite, Attendance } from "../../../src/services/attendance.service";
import { showSuccess, showError } from "../../../src/utils/toast";

type Tab = "details" | "sites" | "attendance";

const TABS: { key: Tab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "sites", label: "Sites" },
  { key: "attendance", label: "Attendance" },
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

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hours}:${minutes}`;
};

export default function StaffDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const applyFields = (data: Staff) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setEmergencyContact(data.emergency_contact ?? "");
  };

  const fetchStaff = useCallback(async () => {
    try {
      const data = await getStaff(id);
      setStaff(data);
      applyFields(data);
    } catch (err: any) {
      showError(err.message);
    }
  }, [id]);

  const fetchAssignedSitesAndAttendance = useCallback(async () => {
    let assigned: Site[] = [];
    try {
      const sites = await getAllSites();
      const siteStaffLists = await Promise.all(sites.map((site) => getSiteStaff(site.id)));
      assigned = sites.filter((_, index) =>
        siteStaffLists[index].some((member) => member.id === id)
      );
      setAssignedSites(assigned);
    } catch (err: any) {
      showError(err.message);
      return;
    }

    try {
      const attendanceLists = await Promise.all(
        assigned.map((site) => getAttendanceBySite(site.id))
      );
      const records = attendanceLists.flat().filter((record) => record.staff_id === id);
      records.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());
      setAttendance(records.slice(0, 20));
    } catch (err: any) {
      showError(err.message);
    }
  }, [id]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStaff(), fetchAssignedSitesAndAttendance()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStaff, fetchAssignedSitesAndAttendance]);

  const siteNameById = Object.fromEntries(assignedSites.map((site) => [site.id, site.name]));

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (staff) {
      applyFields(staff);
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateStaff(id, {
        full_name: fullName,
        phone,
        address,
        emergency_contact: emergencyContact,
      });
      setStaff(updated);
      applyFields(updated);
      setIsEditing(false);
      showSuccess("Staff details saved");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateStaff(id);
      showSuccess("Staff deactivated");
      router.back();
    } catch (err: any) {
      showError(err.message);
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await reactivateStaff(id);
      await fetchStaff();
      showSuccess("Staff reactivated");
    } catch (err: any) {
      showError(err.message);
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

  if (!staff) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.header}>
          <Text style={styles.name}>{staff.full_name}</Text>
          <View style={[styles.badge, staff.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{staff.is_active ? "Active" : "Inactive"}</Text>
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
              <Row label="Email" value={staff.email} />
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
              <Row label="Role" value={staff.role} />
              <FieldInput label="Employee ID" value={staff.employee_id ?? ""} editable={false} />
              <FieldInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                editable={isEditing}
              />
              <FieldInput
                label="Emergency Contact"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                editable={isEditing}
              />
              <Row label="Joined" value={staff.created_at ? formatDate(staff.created_at) : "—"} />
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
                {staff.is_active ? (
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
            {assignedSites.length === 0 ? (
              <Text style={styles.emptyText}>No sites assigned</Text>
            ) : (
              assignedSites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.card}
                  onPress={() => router.push(`/(admin)/sites/${site.id}`)}
                >
                  <Text style={styles.cardTitle}>{site.name}</Text>
                  <Text style={styles.detail}>{site.address}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {activeTab === "attendance" && (
          <>
            {attendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance history</Text>
            ) : (
              attendance.map((record) => {
                const beforeCount = record.photos.filter((photo) => photo.before_photo_url).length;
                const afterCount = record.photos.filter((photo) => photo.after_photo_url).length;
                return (
                  <View key={record.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        {siteNameById[record.site_id] ?? "Unknown site"}
                      </Text>
                      {record.clock_out ? null : (
                        <View style={[styles.badge, styles.badgeActive]}>
                          <Text style={styles.badgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.detail}>Clock in: {formatDateTime(record.clock_in)}</Text>
                    {record.clock_out ? (
                      <Text style={styles.detail}>Clock out: {formatDateTime(record.clock_out)}</Text>
                    ) : null}
                    <Text style={styles.detail}>
                      Photos: {beforeCount} before, {afterCount} after
                    </Text>
                  </View>
                );
              })
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
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
  emptyText: {
    color: "#666",
    marginBottom: 16,
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
});
