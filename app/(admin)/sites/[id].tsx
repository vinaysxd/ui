import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getSite,
  updateSite,
  deactivateSite,
  reactivateSite,
  getSiteStaff,
  assignStaff,
  unassignStaff,
  Site,
  SiteStaffMember,
} from "../../../src/services/sites.service";
import { getAllClients, Client } from "../../../src/services/client.service";
import { getAllStaff, Staff } from "../../../src/services/staff.service";
import { getAttendanceBySite, Attendance } from "../../../src/services/attendance.service";
import { getSiteNotes, SiteNote } from "../../../src/services/notes.service";

type Tab = "details" | "staff" | "attendance" | "notes";

const TABS: { key: Tab; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "staff", label: "Staff" },
  { key: "attendance", label: "Attendance" },
  { key: "notes", label: "Notes" },
];

const clientDisplayLabel = (client: { full_name: string; company_name?: string | null }): string =>
  client.company_name ? `${client.full_name} (${client.company_name})` : client.full_name;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export default function SiteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("details");

  const [site, setSite] = useState<Site | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [selectedClientLabel, setSelectedClientLabel] = useState<string>("");

  const [clients, setClients] = useState<Client[]>([]);
  const [clientPickerVisible, setClientPickerVisible] = useState<boolean>(false);

  const [assignedStaff, setAssignedStaff] = useState<SiteStaffMember[]>([]);
  const [assignedStaffLoading, setAssignedStaffLoading] = useState<boolean>(true);
  const [staffError, setStaffError] = useState<string>("");
  const [unassigningId, setUnassigningId] = useState<string>("");

  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allStaffLoaded, setAllStaffLoaded] = useState<boolean>(false);
  const [allStaffLoading, setAllStaffLoading] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string>("");

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string>("");

  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const applyFields = (data: Site) => {
    setName(data.name ?? "");
    setAddress(data.address ?? "");
    setLatitude(data.latitude !== undefined ? String(data.latitude) : "");
    setLongitude(data.longitude !== undefined ? String(data.longitude) : "");
    setClientId(data.client_id ?? "");
    setSelectedClientLabel(data.client ? clientDisplayLabel(data.client) : "");
  };

  const fetchSite = useCallback(async () => {
    setError("");
    try {
      const data = await getSite(id);
      setSite(data);
      applyFields(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAssignedStaff = useCallback(async () => {
    setStaffError("");
    try {
      const data = await getSiteStaff(id);
      setAssignedStaff(data);
    } catch (err: any) {
      setStaffError(err.message);
    } finally {
      setAssignedStaffLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSite();
    fetchAssignedStaff();
  }, [fetchSite, fetchAssignedStaff]);

  const fetchAttendance = useCallback(async () => {
    setAttendanceError("");
    setAttendanceLoading(true);
    try {
      const data = await getAttendanceBySite(id);
      setAttendance(data);
      setAttendanceLoaded(true);
    } catch (err: any) {
      setAttendanceError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    setNotesError("");
    setNotesLoading(true);
    try {
      const data = await getSiteNotes(id);
      setNotes(data);
      setNotesLoaded(true);
    } catch (err: any) {
      setNotesError(err.message);
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === "attendance" && !attendanceLoaded) {
      fetchAttendance();
    }
    if (activeTab === "notes" && !notesLoaded) {
      fetchNotes();
    }
  }, [activeTab, attendanceLoaded, notesLoaded, fetchAttendance, fetchNotes]);

  const ensureClientsLoaded = async () => {
    if (clients.length > 0) {
      return;
    }
    try {
      const data = await getAllClients();
      setClients(data.filter((client) => client.is_active));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = async () => {
    setError("");
    await ensureClientsLoaded();
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (site) {
      applyFields(site);
    }
    setError("");
    setIsEditing(false);
  };

  const handleSelectClient = (client: Client) => {
    setClientId(client.id);
    setSelectedClientLabel(clientDisplayLabel(client));
    setClientPickerVisible(false);
  };

  const handleSave = async () => {
    setError("");

    if (!name.trim() || !address.trim() || !latitude.trim() || !longitude.trim() || !clientId) {
      setError("Name, address, latitude, longitude, and client are all required");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError("Latitude must be a number between -90 and 90");
      return;
    }

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError("Longitude must be a number between -180 and 180");
      return;
    }

    setSaving(true);
    try {
      await updateSite(id, {
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        client_id: clientId,
      });
      await fetchSite();
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
      await deactivateSite(id);
      await fetchSite();
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
      await reactivateSite(id);
      await fetchSite();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReactivating(false);
    }
  };

  const handleUnassign = async (profileId: string) => {
    setUnassigningId(profileId);
    setStaffError("");
    try {
      await unassignStaff(id, profileId);
      setAssignedStaff((prev) => prev.filter((member) => member.id !== profileId));
    } catch (err: any) {
      setStaffError(err.message);
    } finally {
      setUnassigningId("");
    }
  };

  const handleOpenAssignModal = async () => {
    setStaffError("");
    setAssignModalVisible(true);
    if (allStaffLoaded) {
      return;
    }
    setAllStaffLoading(true);
    try {
      const data = await getAllStaff();
      setAllStaff(data);
      setAllStaffLoaded(true);
    } catch (err: any) {
      setStaffError(err.message);
    } finally {
      setAllStaffLoading(false);
    }
  };

  const handleAssign = async (profileId: string) => {
    setAssigningId(profileId);
    setStaffError("");
    try {
      await assignStaff(id, profileId);
      await fetchAssignedStaff();
    } catch (err: any) {
      setStaffError(err.message);
    } finally {
      setAssigningId("");
    }
  };

  const assignedIds = new Set(assignedStaff.map((member) => member.id));
  const unassignedActiveStaff = allStaff.filter(
    (member) => member.is_active && member.profile_id && !assignedIds.has(member.profile_id)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !site) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!site) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <BackButton onPress={() => router.back()} />

        <View style={styles.header}>
          <Text style={styles.name}>{site.name}</Text>
          <View style={[styles.badge, site.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={styles.badgeText}>{site.is_active ? "Active" : "Inactive"}</Text>
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
            <Text style={styles.sectionTitle}>Site Details</Text>
            <View style={styles.section}>
              <FieldInput label="Name" value={name} onChangeText={setName} editable={isEditing} />
              <FieldInput
                label="Address"
                value={address}
                onChangeText={setAddress}
                editable={isEditing}
              />
              <FieldInput
                label="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                editable={isEditing}
                keyboardType="numbers-and-punctuation"
              />
              <FieldInput
                label="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                editable={isEditing}
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.fieldRow}>
                <Text style={styles.rowLabel}>Client</Text>
                {isEditing ? (
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setClientPickerVisible(true)}
                  >
                    <Text
                      style={selectedClientLabel ? styles.dropdownText : styles.dropdownPlaceholder}
                    >
                      {selectedClientLabel || "Select a client"}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={18} color="#666" />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.rowValueBlock}>{selectedClientLabel || "No client"}</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Client Details</Text>
            <View style={styles.section}>
              {site.client ? (
                <>
                  <Row label="Full Name" value={site.client.full_name} />
                  <Row label="Email" value={site.client.email} />
                  <Row label="Phone" value={site.client.phone} />
                  <Row label="Company Name" value={site.client.company_name ?? "—"} />
                  <Row label="Billing Address" value={site.client.billing_address ?? "—"} />
                  <Row label="Contact Person" value={site.client.contact_person ?? "—"} />
                </>
              ) : (
                <Text style={styles.emptyText}>No client assigned.</Text>
              )}
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
                {site.is_active ? (
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

        {activeTab === "staff" && (
          <>
            <View style={styles.staffSectionHeader}>
              <Text style={styles.sectionTitle}>Assigned Staff</Text>
              <TouchableOpacity style={styles.assignButton} onPress={handleOpenAssignModal}>
                <Ionicons name="person-add-outline" size={16} color="#fff" />
                <Text style={styles.assignButtonText}>Assign Staff</Text>
              </TouchableOpacity>
            </View>

            {staffError ? <Text style={styles.errorText}>{staffError}</Text> : null}

            {assignedStaffLoading ? (
              <ActivityIndicator style={styles.staffLoading} />
            ) : assignedStaff.length === 0 ? (
              <Text style={styles.emptyText}>No staff assigned to this site.</Text>
            ) : (
              assignedStaff.map((member) => (
                <View key={member.id} style={styles.staffCard}>
                  <View style={styles.staffCardInfo}>
                    <Text style={styles.staffName}>{member.full_name}</Text>
                    <Text style={styles.detail}>{member.phone}</Text>
                    <View
                      style={[
                        styles.badge,
                        styles.staffBadge,
                        member.is_active ? styles.badgeActive : styles.badgeInactive,
                      ]}
                    >
                      <Text style={styles.badgeText}>{member.is_active ? "Active" : "Inactive"}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.unassignButton}
                    onPress={() => handleUnassign(member.id)}
                    disabled={unassigningId === member.id}
                  >
                    {unassigningId === member.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.unassignButtonText}>Unassign</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === "attendance" && (
          <>
            {attendanceError ? <Text style={styles.errorText}>{attendanceError}</Text> : null}
            {attendanceLoading ? (
              <ActivityIndicator style={styles.staffLoading} />
            ) : attendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records.</Text>
            ) : (
              attendance.map((record) => (
                <View key={record.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{record.staff?.full_name ?? "Unknown staff"}</Text>
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
                </View>
              ))
            )}
          </>
        )}

        {activeTab === "notes" && (
          <>
            {notesError ? <Text style={styles.errorText}>{notesError}</Text> : null}
            {notesLoading ? (
              <ActivityIndicator style={styles.staffLoading} />
            ) : notes.length === 0 ? (
              <Text style={styles.emptyText}>No notes for this site.</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{note.author?.full_name ?? "Unknown author"}</Text>
                    <View
                      style={[
                        styles.badge,
                        note.type === "staff" ? styles.badgeStaff : styles.badgeClient,
                      ]}
                    >
                      <Text style={styles.badgeText}>{note.type === "staff" ? "Staff" : "Client"}</Text>
                    </View>
                  </View>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.detail}>{formatDateTime(note.created_at)}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={clientPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Client</Text>
              <TouchableOpacity onPress={() => setClientPickerVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No active clients found.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalRow} onPress={() => handleSelectClient(item)}>
                  <Text style={styles.modalRowText}>{clientDisplayLabel(item)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Staff</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {allStaffLoading ? (
              <ActivityIndicator style={styles.staffLoading} />
            ) : (
              <FlatList
                data={unassignedActiveStaff}
                keyExtractor={(item) => item.profile_id ?? item.id}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No unassigned active staff available.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalRowText}>{item.full_name}</Text>
                    <TouchableOpacity
                      style={styles.assignRowButton}
                      onPress={() => handleAssign(item.profile_id!)}
                      disabled={assigningId === item.profile_id}
                    >
                      {assigningId === item.profile_id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.assignRowButtonText}>Assign</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  keyboardType?: "default" | "numbers-and-punctuation";
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
  badgeStaff: {
    backgroundColor: "#2563eb",
  },
  badgeClient: {
    backgroundColor: "#7c3aed",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
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
  noteText: {
    fontSize: 14,
    color: "#333",
    marginTop: 6,
    marginBottom: 6,
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
  rowValueBlock: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
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
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 14,
    color: "#000",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#999",
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
  staffSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  assignButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  staffLoading: {
    marginTop: 16,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  staffCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  staffCardInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  staffBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  unassignButton: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  unassignButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalRowText: {
    fontSize: 15,
    flexShrink: 1,
  },
  assignRowButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  assignRowButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});
