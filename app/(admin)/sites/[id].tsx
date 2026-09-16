import { useCallback, useEffect, useState } from "react";
import type { ComponentProps } from "react";
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
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

type Tab = "details" | "staff" | "attendance" | "notes";
type IconName = ComponentProps<typeof Ionicons>["name"];

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

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

const formatDuration = (startIso: string, endIso: string): string => {
  const totalMinutes = Math.max(
    0,
    Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

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
  const [unassigningId, setUnassigningId] = useState<string>("");

  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allStaffLoaded, setAllStaffLoaded] = useState<boolean>(false);
  const [allStaffLoading, setAllStaffLoading] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string>("");

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState<boolean>(false);

  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const applyFields = (data: Site) => {
    setName(data.name ?? "");
    setAddress(data.address ?? "");
    setLatitude(data.latitude !== undefined ? String(data.latitude) : "");
    setLongitude(data.longitude !== undefined ? String(data.longitude) : "");
    setClientId(data.client_id ?? "");
    setSelectedClientLabel(data.client ? clientDisplayLabel(data.client) : "");
  };

  const fetchSite = useCallback(async () => {
    try {
      const data = await getSite(id);
      setSite(data);
      applyFields(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAssignedStaff = useCallback(async () => {
    try {
      const data = await getSiteStaff(id);
      setAssignedStaff(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setAssignedStaffLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSite();
    fetchAssignedStaff();
  }, [fetchSite, fetchAssignedStaff]);

  const fetchAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await getAttendanceBySite(id);
      setAttendance(data);
      setAttendanceLoaded(true);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      const data = await getSiteNotes(id);
      setNotes(data);
      setNotesLoaded(true);
    } catch (err: any) {
      showError(err.message);
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
      showError(err.message);
    }
  };

  const handleEdit = async () => {
    await ensureClientsLoaded();
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (site) {
      applyFields(site);
    }
    setIsEditing(false);
  };

  const handleSelectClient = (client: Client) => {
    setClientId(client.id);
    setSelectedClientLabel(clientDisplayLabel(client));
    setClientPickerVisible(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !latitude.trim() || !longitude.trim() || !clientId) {
      showError("Name, address, latitude, longitude, and client are all required");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      showError("Latitude must be a number between -90 and 90");
      return;
    }

    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      showError("Longitude must be a number between -180 and 180");
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
      showSuccess("Site details saved");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateSite(id);
      await fetchSite();
      showSuccess("Site deactivated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      await reactivateSite(id);
      await fetchSite();
      showSuccess("Site reactivated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setReactivating(false);
    }
  };

  const handleUnassign = async (profileId: string) => {
    setUnassigningId(profileId);
    try {
      await unassignStaff(id, profileId);
      setAssignedStaff((prev) => prev.filter((member) => member.id !== profileId));
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUnassigningId("");
    }
  };

  const handleOpenAssignModal = async () => {
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
      showError(err.message);
    } finally {
      setAllStaffLoading(false);
    }
  };

  const handleAssign = async (profileId: string) => {
    setAssigningId(profileId);
    try {
      await assignStaff(id, profileId);
      await fetchAssignedStaff();
    } catch (err: any) {
      showError(err.message);
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
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!site) {
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
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{site.name}</Text>
            <Text style={styles.addressText}>{site.address}</Text>
          </View>
          <View style={[styles.badge, site.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text
              style={[
                styles.badgeText,
                site.is_active ? styles.badgeTextActive : styles.badgeTextInactive,
              ]}
            >
              {site.is_active ? "Active" : "Inactive"}
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
            <Text style={styles.sectionTitle}>Site Details</Text>
            <View style={styles.goldDivider} />
            <View style={styles.section}>
              <FieldInput
                label="Name"
                icon="business-outline"
                value={name}
                onChangeText={setName}
                editable={isEditing}
                focused={focusedField === "name"}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Address"
                icon="location-outline"
                value={address}
                onChangeText={setAddress}
                editable={isEditing}
                focused={focusedField === "address"}
                onFocus={() => setFocusedField("address")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Latitude"
                icon="navigate-outline"
                value={latitude}
                onChangeText={setLatitude}
                editable={isEditing}
                keyboardType="numbers-and-punctuation"
                focused={focusedField === "latitude"}
                onFocus={() => setFocusedField("latitude")}
                onBlur={() => setFocusedField(null)}
              />
              <FieldInput
                label="Longitude"
                icon="navigate-outline"
                value={longitude}
                onChangeText={setLongitude}
                editable={isEditing}
                keyboardType="numbers-and-punctuation"
                focused={focusedField === "longitude"}
                onFocus={() => setFocusedField("longitude")}
                onBlur={() => setFocusedField(null)}
              />
              <View style={styles.fieldRow}>
                <View style={styles.labelRow}>
                  <Ionicons name="briefcase-outline" size={16} color={COLORS.gold} />
                  <Text style={styles.rowLabel}>Client</Text>
                </View>
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
                    <Ionicons name="chevron-down-outline" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.rowValueBlock}>{selectedClientLabel || "No client"}</Text>
                )}
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
                  {site.is_active ? (
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
            </View>

            <Text style={styles.sectionTitle}>Client Details</Text>
            <View style={styles.clientCard}>
              <View style={styles.goldBar} />
              {site.client ? (
                <>
                  <Row label="Full Name" icon="person-outline" value={site.client.full_name} />
                  <Row label="Email" icon="mail-outline" value={site.client.email} />
                  <Row label="Phone" icon="call-outline" value={site.client.phone} />
                  <Row
                    label="Company Name"
                    icon="briefcase-outline"
                    value={site.client.company_name ?? "—"}
                  />
                  <Row
                    label="Billing Address"
                    icon="location-outline"
                    value={site.client.billing_address ?? "—"}
                  />
                  <Row
                    label="Contact Person"
                    icon="person-circle-outline"
                    value={site.client.contact_person ?? "—"}
                  />
                </>
              ) : (
                <Text style={styles.emptyText}>No client assigned.</Text>
              )}
            </View>
          </>
        )}

        {activeTab === "staff" && (
          <>
            <View style={styles.staffSectionHeader}>
              <Text style={styles.sectionTitle}>Assigned Staff</Text>
              <TouchableOpacity style={styles.assignButton} onPress={handleOpenAssignModal}>
                <Ionicons name="person-add-outline" size={16} color="#1A1A1A" />
                <Text style={styles.assignButtonText}>Assign Staff</Text>
              </TouchableOpacity>
            </View>

            {assignedStaffLoading ? (
              <ActivityIndicator style={styles.staffLoading} color={COLORS.gold} />
            ) : assignedStaff.length === 0 ? (
              <Text style={styles.emptyText}>No staff assigned to this site.</Text>
            ) : (
              assignedStaff.map((member) => (
                <View key={member.id} style={styles.cardShadow}>
                  <View style={styles.staffCard}>
                    <View style={styles.goldBar} />
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{getInitials(member.full_name)}</Text>
                    </View>
                    <View style={styles.staffCardInfo}>
                      <Text style={styles.staffName}>{member.full_name}</Text>
                      <Text style={styles.detailSecondary}>{member.phone}</Text>
                      <View
                        style={[
                          styles.badge,
                          styles.staffBadge,
                          member.is_active ? styles.badgeActive : styles.badgeInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            member.is_active ? styles.badgeTextActive : styles.badgeTextInactive,
                          ]}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.unassignButton}
                      onPress={() => handleUnassign(member.id)}
                      disabled={unassigningId === member.id}
                    >
                      {unassigningId === member.id ? (
                        <ActivityIndicator color={COLORS.danger} size="small" />
                      ) : (
                        <Text style={styles.unassignButtonText}>Unassign</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === "attendance" && (
          <>
            {attendanceLoading ? (
              <ActivityIndicator style={styles.staffLoading} color={COLORS.gold} />
            ) : attendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records.</Text>
            ) : (
              attendance.map((record) => (
                <View key={record.id} style={styles.attendanceCardShadow}>
                  <View style={styles.attendanceCard}>
                    <View style={styles.goldBar} />
                    <View style={styles.attendanceLeft}>
                      <View style={styles.attendanceAvatar}>
                        <Text style={styles.attendanceAvatarText}>
                          {getInitials(record.staff?.full_name ?? "?")}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.attendanceStaffName}>
                          {record.staff?.full_name ?? "Unknown staff"}
                        </Text>
                        <Text style={styles.attendanceSiteName}>{record.site?.name ?? "Today"}</Text>
                      </View>
                    </View>
                    <View style={styles.attendanceRight}>
                      <View style={styles.attendanceStatusRow}>
                        <View
                          style={[
                            styles.attendanceStatusDot,
                            record.clock_out
                              ? styles.attendanceStatusDotMuted
                              : styles.attendanceStatusDotActive,
                          ]}
                        />
                        <Text
                          style={[
                            styles.attendanceStatusText,
                            record.clock_out
                              ? styles.attendanceStatusTextMuted
                              : styles.attendanceStatusTextActive,
                          ]}
                        >
                          {record.clock_out ? formatDateTime(record.clock_out) : "Active"}
                        </Text>
                      </View>
                      <Text style={styles.attendanceClockIn}>{formatDateTime(record.clock_in)}</Text>
                      {record.clock_out ? (
                        <Text style={styles.attendanceDuration}>
                          {formatDuration(record.clock_in, record.clock_out)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === "notes" && (
          <>
            {notesLoading ? (
              <ActivityIndicator style={styles.staffLoading} color={COLORS.gold} />
            ) : notes.length === 0 ? (
              <Text style={styles.emptyText}>No notes for this site.</Text>
            ) : (
              notes.map((note) => {
                const isClient = note.type === "client";
                const card = (
                  <View style={[styles.card, isClient ? styles.cardClient : styles.cardStaff]}>
                    <View style={isClient ? styles.goldBar : styles.staffBar} />
                    <View style={styles.cardHeader}>
                      <Text style={styles.authorName}>{note.author?.full_name ?? "Unknown author"}</Text>
                      <View
                        style={[styles.noteBadge, isClient ? styles.noteBadgeClient : styles.noteBadgeStaff]}
                      >
                        <Text
                          style={[
                            styles.noteBadgeText,
                            isClient ? styles.noteBadgeTextClient : styles.noteBadgeTextStaff,
                          ]}
                        >
                          {isClient ? "CLIENT" : "STAFF"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.noteText}>{note.note}</Text>
                    <Text style={styles.noteTimestamp}>{formatDateTime(note.created_at)}</Text>
                  </View>
                );
                return isClient ? (
                  <View key={note.id} style={styles.cardShadow}>
                    {card}
                  </View>
                ) : (
                  <View key={note.id}>{card}</View>
                );
              })
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
                <Ionicons name="close-outline" size={24} color={COLORS.gold} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No active clients found.</Text>}
              renderItem={({ item }) => {
                const isSelected = item.id === clientId;
                return (
                  <TouchableOpacity style={styles.modalRow} onPress={() => handleSelectClient(item)}>
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
                      {clientDisplayLabel(item)}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.gold} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
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
                <Ionicons name="close-outline" size={24} color={COLORS.gold} />
              </TouchableOpacity>
            </View>
            {allStaffLoading ? (
              <ActivityIndicator style={styles.staffLoading} color={COLORS.gold} />
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
                        <ActivityIndicator color="#1A1A1A" size="small" />
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

function Row({ label, icon, value }: { label: string; icon: IconName; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={16} color={COLORS.gold} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function FieldInput({
  label,
  icon,
  value,
  onChangeText,
  editable,
  keyboardType,
  focused,
  onFocus,
  onBlur,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChangeText?: (text: string) => void;
  editable: boolean;
  keyboardType?: "default" | "numbers-and-punctuation";
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={16} color={COLORS.gold} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled, editable && focused && styles.inputFocused]}
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
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
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
  headerInfo: {
    flexShrink: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gold,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  section: { 
    borderRadius: RADIUS.xl,
    padding: 24,
    marginBottom: 24,
     
    elevation: 3,
  },
  goldDivider: {
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cardShadow: {
    borderRadius: RADIUS.md,
     
    elevation: 2,
  },
  clientCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 24,
    overflow: "hidden",
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
  staffBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardClient: {
    backgroundColor: "#2A2310",
  },
  cardStaff: {
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  attendanceCardShadow: {
    borderRadius: RADIUS.md,
     
    elevation: 3,
    marginBottom: 10,
  },
  attendanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  attendanceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attendanceAvatar: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    justifyContent: "center",
    alignItems: "center",
  },
  attendanceAvatarText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  attendanceStaffName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  attendanceSiteName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  attendanceRight: {
    alignItems: "flex-end",
  },
  attendanceStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  attendanceStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  attendanceStatusDotActive: {
    backgroundColor: COLORS.success,
  },
  attendanceStatusDotMuted: {
    backgroundColor: COLORS.textMuted,
  },
  attendanceStatusText: {
    fontSize: 11,
  },
  attendanceStatusTextActive: {
    color: COLORS.success,
  },
  attendanceStatusTextMuted: {
    color: COLORS.textMuted,
  },
  attendanceClockIn: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  attendanceDuration: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gold,
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  noteTimestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  noteBadge: {
    borderRadius: RADIUS.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  noteBadgeClient: {
    backgroundColor: COLORS.gold,
  },
  noteBadgeStaff: {
    backgroundColor: COLORS.border,
  },
  noteBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  noteBadgeTextClient: {
    color: "#1A1A1A",
  },
  noteBadgeTextStaff: {
    color: COLORS.textMuted,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 16,
  },
  rowValueBlock: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 6,
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
    padding: 12,
    marginTop: 6,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  inputFocused: {
    borderColor: COLORS.gold,
  },
  inputDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    fontWeight: "normal",
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 6,
    backgroundColor: COLORS.surfaceElevated,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.gold,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
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
    fontWeight: "700",
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
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: COLORS.border,
    height: 52,
    justifyContent: "center",
    borderRadius: RADIUS.md,
    alignItems: "center",
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
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  assignButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 13,
  },
  staffLoading: {
    marginTop: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 16,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  staffCardInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  detailSecondary: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  staffBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
  },
  unassignButton: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  unassignButtonText: {
    color: COLORS.danger,
    fontWeight: "600",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
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
    color: COLORS.textPrimary,
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  modalRowText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  modalRowTextSelected: {
    color: COLORS.gold,
  },
  assignRowButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
  },
  assignRowButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 13,
  },
});
