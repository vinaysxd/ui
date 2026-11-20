import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
  RefreshControl,
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
import PaginationControls from "../../../src/components/PaginationControls";
import {
  getAttendanceBySite,
  Attendance,
  AttendancePhoto,
} from "../../../src/services/attendance.service";
import { getSiteNotes, addAdminNote, deleteNote, SiteNote } from "../../../src/services/notes.service";
import { getSiteTasks, addSiteTask, deleteSiteTask, SiteTask } from "../../../src/services/tasks.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import ScreenContainer from "../../../src/components/ScreenContainer";
import ConfirmModal from "../../../src/components/ConfirmModal";
import { daysAgo, formatDuration as formatElapsed } from "../../../src/utils/datetime";
import { getShiftFlag } from "../../../src/utils/attendanceStatus";
import EmptyState from "../../../src/components/EmptyState";
import ChatMessages from "../../../src/components/chat/ChatMessages";
import PhotoThumb from "../../../src/components/PhotoThumb";
import { LOADING_STYLE } from "../../../src/constants/ui";
import Loader from "../../../src/components/Loader";

const ATTENDANCE_PAGE_SIZE = 10;

type Tab = "details" | "staff" | "attendance" | "notes" | "tasks";

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
  { key: "tasks", label: "Tasks" },
];

const capitalise = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Collapse stray whitespace/newlines so multi-line addresses read as one clean line.
const tidy = (s?: string | null): string => (s ?? "").replace(/\s*\n+\s*/g, ", ").replace(/\s{2,}/g, " ").trim();

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

const formatShiftDate = (iso: string): string => {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

type AttRange = "all" | "today" | "7d" | "30d";
const ATT_RANGES: { key: AttRange; label: string; maxDays: number }[] = [
  { key: "all", label: "All", maxDays: Infinity },
  { key: "today", label: "Today", maxDays: 0 },
  { key: "7d", label: "7 days", maxDays: 6 },
  { key: "30d", label: "30 days", maxDays: 29 },
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
  const [unassigningId, setUnassigningId] = useState<string>("");

  const [assignModalVisible, setAssignModalVisible] = useState<boolean>(false);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allStaffLoaded, setAllStaffLoaded] = useState<boolean>(false);
  const [allStaffLoading, setAllStaffLoading] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string>("");

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState<boolean>(false);
  const [attendancePage, setAttendancePage] = useState<number>(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState<number>(1);
  const [attendanceTotal, setAttendanceTotal] = useState<number>(0);
  const [expandedAttendanceId, setExpandedAttendanceId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [attSearch, setAttSearch] = useState<string>("");
  const [attRange, setAttRange] = useState<AttRange>("all");

  const [notes, setNotes] = useState<SiteNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>("");
  const [addingNote, setAddingNote] = useState<boolean>(false);

  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  const [tasksLoaded, setTasksLoaded] = useState<boolean>(false);
  const [tasksRefreshing, setTasksRefreshing] = useState<boolean>(false);
  const [newTaskLabel, setNewTaskLabel] = useState<string>("");
  const [addingTask, setAddingTask] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [deactivateModalVisible, setDeactivateModalVisible] = useState<boolean>(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [deleteNoteModalVisible, setDeleteNoteModalVisible] = useState<boolean>(false);
  const [deleteNoteModalLoading, setDeleteNoteModalLoading] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deleteTaskModalVisible, setDeleteTaskModalVisible] = useState<boolean>(false);
  const [deleteTaskModalLoading, setDeleteTaskModalLoading] = useState<boolean>(false);

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

  const fetchAttendance = useCallback(async (page: number = 1) => {
    setAttendanceLoading(true);
    try {
      const result = await getAttendanceBySite(id, page, ATTENDANCE_PAGE_SIZE);
      setAttendance(result.attendance);
      setAttendancePage(page);
      setAttendanceTotal(result.total);
      setAttendanceTotalPages(result.total_pages);
      setAttendanceLoaded(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await getSiteTasks(id);
      setTasks(data);
      setTasksLoaded(true);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setTasksLoading(false);
      setTasksRefreshing(false);
    }
  }, [id]);

  const openDeleteNoteModal = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteNoteModalVisible(true);
  };

  const closeDeleteNoteModal = () => {
    setDeleteNoteModalVisible(false);
    setNoteToDelete(null);
  };

  const performDeleteNote = async () => {
    if (!noteToDelete) {
      return;
    }
    setDeleteNoteModalLoading(true);
    try {
      await deleteNote(id, noteToDelete);
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
      setDeleteNoteModalVisible(false);
      setNoteToDelete(null);
      showSuccess("Note deleted");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleteNoteModalLoading(false);
    }
  };

  const openDeleteTaskModal = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteTaskModalVisible(true);
  };

  const closeDeleteTaskModal = () => {
    setDeleteTaskModalVisible(false);
    setTaskToDelete(null);
  };

  const performDeleteTask = async () => {
    if (!taskToDelete) {
      return;
    }
    setDeleteTaskModalLoading(true);
    try {
      await deleteSiteTask(id, taskToDelete);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete));
      setDeleteTaskModalVisible(false);
      setTaskToDelete(null);
      showSuccess("Task deleted");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setDeleteTaskModalLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const note = await addAdminNote(id, newNote.trim());
      setNotes((prev) => [note, ...prev]);
      setNewNote("");
      showSuccess("Note added");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskLabel.trim()) {
      showError("Enter a task label");
      return;
    }
    setAddingTask(true);
    try {
      const task = await addSiteTask(id, newTaskLabel.trim());
      setTasks((prev) => [...prev, task]);
      setNewTaskLabel("");
      showSuccess("Task added");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const onRefreshTasks = () => {
    setTasksRefreshing(true);
    fetchTasks();
  };

  useEffect(() => {
    if (activeTab === "attendance" && !attendanceLoaded) {
      fetchAttendance(1);
    }
    if (activeTab === "notes" && !notesLoaded) {
      fetchNotes();
    }
    if (activeTab === "tasks" && !tasksLoaded) {
      fetchTasks();
    }
  }, [activeTab, attendanceLoaded, notesLoaded, tasksLoaded, fetchAttendance, fetchNotes, fetchTasks]);

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
      setDeactivateModalVisible(false);
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
        <Loader size="large" />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.replace("/(admin)/sites")} />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <View style={styles.inner}>
            <BackButton onPress={() => router.replace("/(admin)/sites")} />

            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="business" size={26} color={COLORS.gold} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.name} numberOfLines={2}>
                  {site.name}
                </Text>
                <Text style={styles.addressText} numberOfLines={2}>
                  {tidy(site.address) || "No address"}
                </Text>
              </View>
              <View style={[styles.badge, site.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <View
                  style={[styles.badgeDot, { backgroundColor: site.is_active ? COLORS.success : COLORS.dangerText }]}
                />
                <Text
                  style={[styles.badgeText, site.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}
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
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            activeTab === "tasks" ? (
              <RefreshControl
                refreshing={tasksRefreshing}
                onRefresh={onRefreshTasks}
                tintColor={COLORS.gold}
                colors={[COLORS.gold]}
              />
            ) : undefined
          }
        >
          <View style={styles.inner}>
          {activeTab === "details" && (
            <>
              <View style={styles.panel}>
                <SectionHeading title="Site Information" first />
                <Field
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  editing={isEditing}
                  placeholder="Site name"
                  focused={focusedField === "name"}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
                <Field
                  label="Address"
                  value={tidy(address)}
                  onChangeText={setAddress}
                  editing={isEditing}
                  placeholder="Street, suburb"
                  focused={focusedField === "address"}
                  onFocus={() => setFocusedField("address")}
                  onBlur={() => setFocusedField(null)}
                />
                <Field
                  label="Latitude"
                  value={latitude}
                  onChangeText={setLatitude}
                  editing={isEditing}
                  keyboardType="numbers-and-punctuation"
                  placeholder="-34.8800"
                  focused={focusedField === "latitude"}
                  onFocus={() => setFocusedField("latitude")}
                  onBlur={() => setFocusedField(null)}
                />
                <Field
                  label="Longitude"
                  value={longitude}
                  onChangeText={setLongitude}
                  editing={isEditing}
                  keyboardType="numbers-and-punctuation"
                  placeholder="150.6000"
                  focused={focusedField === "longitude"}
                  onFocus={() => setFocusedField("longitude")}
                  onBlur={() => setFocusedField(null)}
                />

                <SectionHeading title="Client" />
                {isEditing ? (
                  <View style={styles.editField}>
                    <Text style={styles.editLabel}>Client</Text>
                    <TouchableOpacity style={styles.select} onPress={() => setClientPickerVisible(true)}>
                      <Text style={selectedClientLabel ? styles.selectText : styles.selectPlaceholder}>
                        {selectedClientLabel || "Select a client"}
                      </Text>
                      <Ionicons name="chevron-down-outline" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Field label="Client" value={selectedClientLabel} />
                )}
                {site.client ? (
                  <>
                    <Field label="Contact Person" value={site.client.contact_person ?? ""} />
                    <Field label="Email" value={site.client.email} />
                    <Field label="Phone" value={site.client.phone} />
                    <Field label="Company" value={site.client.company_name ?? ""} />
                    <Field label="Billing Address" value={tidy(site.client.billing_address)} />
                  </>
                ) : (
                  <Text style={styles.noClient}>No client assigned.</Text>
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
                    {site.is_active ? (
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
                <Loader style={styles.staffLoading} />
              ) : assignedStaff.length === 0 ? (
                <Text style={styles.emptyText}>No staff assigned to this site.</Text>
              ) : (
                assignedStaff.map((member) => (
                  <View key={member.id} style={styles.cardShadow}>
                    <View style={styles.staffCard}>
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
                        style={[styles.unassignButton, unassigningId === member.id && LOADING_STYLE]}
                        onPress={() => handleUnassign(member.id)}
                        disabled={unassigningId !== ""}
                      >
                        {unassigningId === member.id ? (
                          <Loader />
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

          {activeTab === "attendance" && (() => {
            const range = ATT_RANGES.find((r) => r.key === attRange)!;
            const q = attSearch.trim().toLowerCase();
            const shown = attendance.filter(
              (r) =>
                daysAgo(r.clock_in) <= range.maxDays &&
                (!q || (r.staff?.full_name ?? "").toLowerCase().includes(q))
            );
            const staffCount = new Set(attendance.map((r) => r.staff_id)).size;
            const filtering = attRange !== "all" || q.length > 0;

            return (
              <>
                <View style={styles.attSummary}>
                  <Text style={styles.attSummaryText}>
                    <Text style={styles.attSummaryStrong}>{attendanceTotal}</Text>{" "}
                    {attendanceTotal === 1 ? "record" : "records"} ·{" "}
                    <Text style={styles.attSummaryStrong}>{staffCount}</Text> staff
                    {filtering ? `  ·  ${shown.length} shown` : ""}
                  </Text>
                </View>

                <View style={styles.attFilters}>
                  <View style={styles.attSearchBox}>
                    <Ionicons name="search" size={15} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.attSearchInput}
                      value={attSearch}
                      onChangeText={setAttSearch}
                      placeholder="Search staff"
                      placeholderTextColor={COLORS.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {attSearch ? (
                      <TouchableOpacity onPress={() => setAttSearch("")} hitSlop={8}>
                        <Ionicons name="close-circle" size={15} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={styles.attChips}>
                    {ATT_RANGES.map((r) => {
                      const active = r.key === attRange;
                      return (
                        <TouchableOpacity
                          key={r.key}
                          style={[styles.attChip, active && styles.attChipActive]}
                          onPress={() => setAttRange(r.key)}
                        >
                          <Text style={[styles.attChipText, active && styles.attChipTextActive]}>{r.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {attendanceLoading ? (
                  <Loader style={styles.staffLoading} />
                ) : attendance.length === 0 ? (
                  <EmptyState
                    icon="time-outline"
                    title="No attendance records"
                    hint="Clock-ins at this site will show up here."
                  />
                ) : shown.length === 0 ? (
                  <EmptyState
                    icon="search-outline"
                    title="No records match"
                    hint="Try a different date range or name."
                    actionLabel="Clear filters"
                    onAction={() => {
                      setAttSearch("");
                      setAttRange("all");
                    }}
                  />
                ) : (
                  shown.map((record) => {
                    const isExpanded = expandedAttendanceId === record.id;
                    const flag = getShiftFlag(record);
                    const flagColor = flag
                      ? flag.level === "danger"
                        ? COLORS.dangerText
                        : COLORS.warning
                      : null;
                    const open = !record.clock_out;
                    const durationText = record.clock_out
                      ? formatDuration(record.clock_in, record.clock_out)
                      : formatElapsed(record.clock_in);
                    const pairs = record.photos.length;
                    return (
                      <View key={record.id} style={styles.attCard}>
                        <TouchableOpacity
                          style={styles.attCardHeader}
                          activeOpacity={0.7}
                          onPress={() => setExpandedAttendanceId(isExpanded ? null : record.id)}
                        >
                          <View style={styles.attAvatar}>
                            <Text style={styles.attAvatarText}>{getInitials(record.staff?.full_name ?? "?")}</Text>
                          </View>
                          <View style={styles.attInfo}>
                            <Text style={styles.attName} numberOfLines={1}>
                              {record.staff?.full_name ?? "Unknown staff"}
                            </Text>
                            <View style={styles.attMetaRow}>
                              <Text style={styles.attMeta}>{formatShiftDate(record.clock_in)}</Text>
                              <Text style={styles.attMetaDot}>·</Text>
                              <Ionicons name="camera-outline" size={12} color={COLORS.textMuted} />
                              <Text style={styles.attMeta}>
                                {pairs} {pairs === 1 ? "photo pair" : "photo pairs"}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.attRight}>
                            <View style={styles.attDurationRow}>
                              {flag && <Ionicons name="warning" size={14} color={flagColor!} />}
                              <Text
                                style={[
                                  styles.attDuration,
                                  open && { color: COLORS.success },
                                  flagColor ? { color: flagColor } : null,
                                ]}
                              >
                                {durationText}
                              </Text>
                            </View>
                            {open && <Text style={styles.attActive}>Clocked in</Text>}
                          </View>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={COLORS.textMuted}
                          />
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.attExpanded}>
                            <View style={styles.attFacts}>
                              <View style={styles.attFact}>
                                <Text style={styles.attFactLabel}>Clock in</Text>
                                <Text style={styles.attFactValue}>{formatDateTime(record.clock_in)}</Text>
                              </View>
                              <View style={styles.attFact}>
                                <Text style={styles.attFactLabel}>Clock out</Text>
                                <Text style={styles.attFactValue}>
                                  {record.clock_out ? formatDateTime(record.clock_out) : "Still clocked in"}
                                </Text>
                              </View>
                              <View style={styles.attFact}>
                                <Text style={styles.attFactLabel}>{open ? "Elapsed" : "Duration"}</Text>
                                <Text style={[styles.attFactValue, flagColor ? { color: flagColor } : null]}>
                                  {durationText}
                                </Text>
                              </View>
                            </View>

                            {flag && (
                              <Text
                                style={[
                                  styles.attFlag,
                                  flag.level === "danger" ? styles.attFlagDanger : styles.attFlagWarning,
                                ]}
                              >
                                ⚠ {flag.label}
                              </Text>
                            )}

                            {pairs > 0 ? (
                              record.photos.map((photo) => <AttendancePhotoPair key={photo.id} photo={photo} />)
                            ) : (
                              <Text style={styles.noPhotosText}>No photos for this record.</Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
                <PaginationControls
                  page={attendancePage}
                  totalPages={attendanceTotalPages}
                  total={attendanceTotal}
                  limit={ATTENDANCE_PAGE_SIZE}
                  disabled={attendanceLoading}
                  onPageChange={fetchAttendance}
                />
              </>
            );
          })()}

          {activeTab === "notes" && (
            <>
              <View style={styles.notesToolbar}>
                <Text style={styles.chatHintText} numberOfLines={2}>
                  {notes.length > 0
                    ? "Admin notes appear on the left · client messages on the right · tap a message to delete"
                    : ""}
                </Text>
                <TouchableOpacity
                  style={[styles.refreshBtn, notesLoading && LOADING_STYLE]}
                  onPress={fetchNotes}
                  disabled={notesLoading}
                  accessibilityLabel="Refresh notes"
                >
                  <Ionicons name="refresh" size={14} color={COLORS.gold} />
                  <Text style={styles.refreshText}>{notesLoading ? "Refreshing…" : "Refresh"}</Text>
                </TouchableOpacity>
              </View>
              {notesLoading && notes.length === 0 ? (
                <Loader style={styles.staffLoading} />
              ) : notes.length === 0 ? (
                <EmptyState
                  icon="chatbubbles-outline"
                  title="No notes yet"
                  hint="Write the first note below."
                />
              ) : (
                <>
                  <View style={styles.chatPanel}>
                    <ChatMessages
                      notes={notes}
                      alignBy="type"
                      canDelete={() => true}
                      onDelete={(n) => openDeleteNoteModal(n.id)}
                    />
                  </View>
                </>
              )}

              <View style={styles.addTaskRow}>
                <TextInput
                  style={[styles.addTaskInput, styles.noteInput]}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Write a note..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  editable={!addingNote}
                />
                <TouchableOpacity
                  style={[styles.addTaskButton, (addingNote || !newNote.trim()) && LOADING_STYLE]}
                  onPress={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                >
                  {addingNote ? <Loader tone="dark" /> : <Text style={styles.addTaskButtonText}>Send</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === "tasks" && (
            <>
              <Text style={styles.sectionTitle}>Tasks</Text>
              {tasksLoading && !tasksRefreshing ? (
                <Loader style={styles.staffLoading} />
              ) : tasks.length === 0 ? (
                <Text style={styles.emptyText}>No tasks added yet</Text>
              ) : (
                tasks.map((task) => (
                  <View key={task.id} style={styles.taskCard}>
                    <Text style={styles.taskLabel}>{task.label}</Text>
                    <TouchableOpacity
                      style={styles.taskDeleteButton}
                      onPress={() => openDeleteTaskModal(task.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={styles.addTaskRow}>
                <TextInput
                  style={styles.addTaskInput}
                  value={newTaskLabel}
                  onChangeText={setNewTaskLabel}
                  placeholder="Enter task label e.g. Kitchen, Bathroom"
                  placeholderTextColor={COLORS.textMuted}
                  editable={!addingTask}
                />
                <TouchableOpacity
                  style={[styles.addTaskButton, addingTask && LOADING_STYLE]}
                  onPress={handleAddTask}
                  disabled={addingTask}
                >
                  {addingTask ? (
                    <Loader tone="dark" />
                  ) : (
                    <Text style={styles.addTaskButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>
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
              <FlatList keyboardShouldPersistTaps="handled"
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
                <Loader style={styles.staffLoading} />
              ) : (
                <FlatList keyboardShouldPersistTaps="handled"
                  data={unassignedActiveStaff}
                  keyExtractor={(item) => item.profile_id ?? item.id}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No unassigned active staff available.</Text>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.modalRow}>
                      <Text style={styles.modalRowText}>{item.full_name}</Text>
                      <TouchableOpacity
                        style={[styles.assignRowButton, assigningId === item.profile_id && LOADING_STYLE]}
                        onPress={() => handleAssign(item.profile_id!)}
                        disabled={assigningId !== ""}
                      >
                        {assigningId === item.profile_id ? (
                          <Loader tone="dark" />
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

        <ConfirmModal
          visible={deactivateModalVisible}
          title="Deactivate Site"
          message="Are you sure you want to deactivate this site?"
          confirmText="Deactivate"
          confirmStyle="destructive"
          loading={deactivating}
          onConfirm={handleDeactivate}
          onCancel={() => setDeactivateModalVisible(false)}
        />

        <ConfirmModal
          visible={deleteNoteModalVisible}
          title="Delete Note"
          message="Are you sure you want to delete this note?"
          confirmText="Delete"
          confirmStyle="destructive"
          loading={deleteNoteModalLoading}
          onConfirm={performDeleteNote}
          onCancel={closeDeleteNoteModal}
        />

        <ConfirmModal
          visible={deleteTaskModalVisible}
          title="Delete Task"
          message="Are you sure you want to delete this task?"
          confirmText="Delete"
          confirmStyle="destructive"
          loading={deleteTaskModalLoading}
          onConfirm={performDeleteTask}
          onCancel={closeDeleteTaskModal}
        />
      </View>
    </ScreenContainer>
  );
}

function AttendancePhotoPair({ photo }: { photo: AttendancePhoto }) {
  return (
    <View style={styles.photoPair}>
      <View style={styles.photoPairHeader}>
        <Ionicons name="location-outline" size={14} color={COLORS.gold} />
        <Text style={styles.photoPairLabel}>{photo.label}</Text>
      </View>
      <View style={styles.thumbRow}>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>Before</Text>
          <PhotoThumb path={photo.before_photo_url} />
        </View>
        <View style={styles.thumbColumn}>
          <Text style={styles.thumbCaption}>After</Text>
          <PhotoThumb path={photo.after_photo_url} />
        </View>
      </View>
    </View>
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
  keyboardType?: "default" | "numbers-and-punctuation";
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
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.goldTint,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: COLORS.textPrimary,
  },
  addressText: {
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
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: COLORS.cardHigh,
    ...SHADOW.card,
  },
  selectText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    flexShrink: 1,
  },
  selectPlaceholder: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  noClient: {
    color: COLORS.textMuted,
    fontSize: 14,
    paddingVertical: 8,
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gold,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  section: { 
    borderRadius: RADIUS.md,
    padding: 24,
    marginBottom: 24,
     
    elevation: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  cardShadow: {
    borderRadius: RADIUS.md,
     
    elevation: 0,
  },
  clientCard: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
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
    elevation: 0,
  },
  cardClient: {
    backgroundColor: COLORS.accentBg,
  },
  cardStaff: {
    backgroundColor: COLORS.foreground,
    shadowColor: COLORS.shadow,
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteNoteButton: {
    zIndex: 999,
    padding: 8,
  },
  notesToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
    minHeight: 30,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    ...SHADOW.card,
  },
  refreshText: { color: COLORS.gold, fontSize: 12, fontWeight: "600" },
  chatHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  chatHintText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  chatPanel: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.lg,
    padding: 16,
    paddingTop: 4,
    ...SHADOW.card,
  },
  attSummary: {
    marginBottom: 12,
  },
  attSummaryText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  attSummaryStrong: {
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  attFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  attSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexGrow: 1,
    flexBasis: 200,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.foreground,
    ...SHADOW.card,
  },
  attSearchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    outlineStyle: "none",
  } as any,
  attChips: {
    flexDirection: "row",
    gap: 6,
  },
  attChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.foreground,
    ...SHADOW.card,
  },
  attChipActive: {
    backgroundColor: COLORS.accentBg,
  },
  attChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  attChipTextActive: {
    color: COLORS.gold,
  },
  attCard: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    marginBottom: 8,
    overflow: "hidden",
    ...SHADOW.card,
  },
  attCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  attAvatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldTint,
    justifyContent: "center",
    alignItems: "center",
  },
  attAvatarText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
  },
  attInfo: {
    flex: 1,
    minWidth: 0,
  },
  attName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  attMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  attMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  attMetaDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  attRight: {
    alignItems: "flex-end",
  },
  attDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  attDuration: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.gold,
    letterSpacing: -0.2,
  },
  attActive: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 1,
  },
  attExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    backgroundColor: COLORS.zebra,
  },
  attFacts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingVertical: 12,
  },
  attFact: {
    flexGrow: 1,
    flexBasis: 140,
  },
  attFactLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.textMuted,
  },
  attFactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  attFlag: {
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  attFlagDanger: {
    backgroundColor: "rgba(220,38,38,0.15)",
    color: COLORS.dangerText,
  },
  attFlagWarning: {
    backgroundColor: "rgba(245,158,11,0.15)",
    color: COLORS.warning,
  },
  photoPair: {
    paddingTop: 10,
  },
  photoPairHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  photoPairLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  thumbRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  thumbColumn: {
    alignItems: "flex-start",
  },
  thumbCaption: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  noPhotosText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 12,
    paddingTop: 12,
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
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
  },
  taskLabel: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  taskDeleteButton: {
    padding: 4,
    marginLeft: 12,
  },
  addTaskRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  addTaskInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    ...SHADOW.card,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  addTaskButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addTaskButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 14,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...SHADOW.card,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 6,
    backgroundColor: COLORS.foreground,
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
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: COLORS.shadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 0,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.goldTint,
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
    borderRadius: RADIUS.md,
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
    backgroundColor: COLORS.foreground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: "70%",
    padding: 16,
    ...SHADOW.card,
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
    backgroundColor: COLORS.foreground,
    ...SHADOW.card,
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
