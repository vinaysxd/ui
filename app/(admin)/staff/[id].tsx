import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
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
import { COLORS, RADIUS, SHADOW } from "../../../src/constants/theme";
import ScreenContainer from "../../../src/components/ScreenContainer";
import ConfirmModal from "../../../src/components/ConfirmModal";
import { LOADING_STYLE } from "../../../src/constants/ui";
import Loader from "../../../src/components/Loader";
import SitesTable from "../../../src/components/admin/SitesTable";
import EmptyState from "../../../src/components/EmptyState";
import PaginationControls from "../../../src/components/PaginationControls";
import AttendanceRow, { ACTIONS_WIDTH, COLUMN_FLEX } from "../../../src/components/admin/AttendanceRow";
import AttendanceCard from "../../../src/components/admin/AttendanceCard";
import AttendanceDetailModal from "../../../src/components/admin/AttendanceDetailModal";
import AttendanceFilters, {
  AttendanceFilterState,
  EMPTY_FILTERS,
  filterAttendance,
  hasActiveFilters,
} from "../../../src/components/admin/AttendanceFilters";
import { sortMostRecent } from "../../../src/utils/attendanceStatus";

const PAGE_SIZE = 10;

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

const capitalise = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

// Collapse stray whitespace/newlines so "23 Vendetta Street,\n Nowra" reads as one clean line.
const tidy = (s?: string | null): string => (s ?? "").replace(/\s*\n+\s*/g, ", ").replace(/\s{2,}/g, " ").trim();

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export default function StaffDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [deactivateModalVisible, setDeactivateModalVisible] = useState<boolean>(false);

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [filters, setFilters] = useState<AttendanceFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState<number>(1);
  const [visible, setVisible] = useState<number>(PAGE_SIZE);
  const [selected, setSelected] = useState<Attendance | null>(null);

  const updateFilters = (next: AttendanceFilterState) => {
    setFilters(next);
    setPage(1);
    setVisible(PAGE_SIZE);
  };

  const applyFields = (data: Staff) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAddress(tidy(data.address));
    setEmergencyContact(tidy(data.emergency_contact));
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
      setAttendance(sortMostRecent(records).slice(0, 100));
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

  // Records from the per-site endpoint may not embed site/staff, so attach them for the shared table.
  const records = useMemo<Attendance[]>(
    () =>
      attendance.map((r) => ({
        ...r,
        site: r.site ?? assignedSites.find((s) => s.id === r.site_id) ?? null,
        staff: r.staff ?? (staff ? { id: staff.id, full_name: staff.full_name, email: staff.email, phone: staff.phone } : null),
      })),
    [attendance, assignedSites, staff]
  );
  const filtered = useMemo(() => filterAttendance(records, filters), [records, filters]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      setDeactivateModalVisible(false);
      showSuccess("Staff deactivated");
      router.replace("/(admin)/staff");
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
        <Loader size="large" />
      </View>
    );
  }

  if (!staff) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.replace("/(admin)/staff")} />
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
            <BackButton onPress={() => router.replace("/(admin)/staff")} />

            <View style={styles.header}>
              {staff.avatar_url && !avatarFailed ? (
                <Image
                  source={{ uri: staff.avatar_url }}
                  style={styles.avatar}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initialsOf(staff.full_name)}</Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.name} numberOfLines={2}>
                  {staff.full_name}
                </Text>
                <Text style={styles.subtitle}>{staff.email}</Text>
              </View>
              <View style={[styles.badge, staff.is_active ? styles.badgeActive : styles.badgeInactive]}>
                <View style={[styles.badgeDot, { backgroundColor: staff.is_active ? COLORS.success : COLORS.dangerText }]} />
                <Text style={[styles.badgeText, staff.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {staff.is_active ? "Active" : "Inactive"}
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
                  <SectionHeading title="Personal Information" first />
                  <Field
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    editing={isEditing}
                    placeholder="Full name"
                    {...field("fullName")}
                  />
                  <Field label="Email" value={staff.email} />
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
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    editing={isEditing}
                    placeholder="Street, suburb"
                    {...field("address")}
                  />

                  <SectionHeading title="Employment" />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Role</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{capitalise(staff.role)}</Text>
                    </View>
                  </View>
                  <Field label="Employee ID" value={staff.employee_id ?? ""} />
                  <Field label="Joined" value={staff.created_at ? formatDate(staff.created_at) : ""} />

                  <SectionHeading title="Emergency Contact" />
                  <Field
                    label="Name & Phone"
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    editing={isEditing}
                    placeholder="e.g. Jane Smith, 0400 000 000"
                    last
                    {...field("emergencyContact")}
                  />
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
                      {staff.is_active ? (
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
                {assignedSites.length === 0 ? (
                  <EmptyState
                    icon="business-outline"
                    title="No sites assigned"
                    hint="Sites this staff member is assigned to will show up here."
                  />
                ) : (
                  <SitesTable sites={assignedSites} />
                )}
              </>
            )}

            {activeTab === "attendance" && (
              <>
                {records.length === 0 ? (
                  <EmptyState
                    icon="time-outline"
                    title="No attendance history"
                    hint="Clock-ins for this staff member will show up here."
                  />
                ) : (
                  <>
                    <View style={styles.attHeader}>
                      <Text style={styles.attTitle}>Attendance</Text>
                      <Text style={styles.attSubtitle}>
                        {filtered.length} {filtered.length === 1 ? "record" : "records"}
                        {hasActiveFilters(filters) ? " (filtered)" : ""} · newest first
                      </Text>
                    </View>
                    <AttendanceFilters records={records} value={filters} onChange={updateFilters} hideStaff />

                    {filtered.length === 0 ? (
                      <EmptyState
                        icon="search-outline"
                        title="No records match these filters"
                        hint="Try a different site or date range."
                        actionLabel="Clear filters"
                        onAction={() => updateFilters(EMPTY_FILTERS)}
                      />
                    ) : isDesktop ? (
                      <>
                        <View style={styles.table}>
                          <View style={styles.tableHeaderRow}>
                            <Text style={[styles.th, { flex: COLUMN_FLEX.site }]}>Site</Text>
                            <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock In</Text>
                            <Text style={[styles.th, { flex: COLUMN_FLEX.time }]}>Clock Out</Text>
                            <Text style={[styles.th, { flex: COLUMN_FLEX.duration }]}>Duration</Text>
                            <Text style={[styles.th, { flex: COLUMN_FLEX.status }]}>Status</Text>
                            <View style={{ width: ACTIONS_WIDTH }} />
                          </View>
                          {pageRows.map((record, i) => (
                            <AttendanceRow key={record.id} record={record} index={i} onPress={setSelected} hideStaff />
                          ))}
                        </View>
                        {filtered.length > PAGE_SIZE && (
                          <PaginationControls
                            page={page}
                            totalPages={totalPages}
                            total={filtered.length}
                            limit={PAGE_SIZE}
                            onPageChange={setPage}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {filtered.slice(0, visible).map((record) => (
                          <AttendanceCard key={record.id} record={record} onPress={setSelected} />
                        ))}
                        {filtered.length > visible && (
                          <TouchableOpacity style={styles.showMore} onPress={() => setVisible((v) => v + PAGE_SIZE)}>
                            <Text style={styles.showMoreText}>Show more ({filtered.length - visible} remaining)</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <AttendanceDetailModal record={selected} onClose={() => setSelected(null)} />

        <ConfirmModal
          visible={deactivateModalVisible}
          title="Deactivate Staff"
          message={`Are you sure you want to deactivate ${staff.full_name}? They will no longer be able to clock in.`}
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
  last,
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
  last?: boolean;
}) {
  if (editing && onChangeText) {
    return (
      <View style={[styles.editField, last && { marginBottom: 0 }]}>
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
  emptyText: {
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  attHeader: {
    marginBottom: 16,
  },
  attTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  attSubtitle: {
    color: COLORS.gold,
    fontSize: 12,
    marginTop: 2,
  },
  table: {
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  th: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  showMore: {
    alignSelf: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
    ...SHADOW.card,
  },
  showMoreText: { color: COLORS.gold, fontSize: 13, fontWeight: "600" },
});
