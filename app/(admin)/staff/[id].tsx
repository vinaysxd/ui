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

export default function StaffDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [reactivating, setReactivating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const applyFields = (data: Staff) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setEmergencyContact(data.emergency_contact ?? "");
  };

  const fetchStaff = useCallback(async () => {
    setError("");
    try {
      const data = await getStaff(id);
      setStaff(data);
      applyFields(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleEdit = () => {
    setError("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (staff) {
      applyFields(staff);
    }
    setError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
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
      await deactivateStaff(id);
      router.back();
    } catch (err: any) {
      setError(err.message);
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    setError("");
    try {
      await reactivateStaff(id);
      await fetchStaff();
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

  if (error && !staff) {
    return (
      <View style={styles.centered}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!staff) {
    return null;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.back()} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.header}>
        <Text style={styles.name}>{staff.full_name}</Text>
        <View style={[styles.badge, staff.is_active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{staff.is_active ? "Active" : "Inactive"}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Row label="Email" value={staff.email} />
        <FieldInput label="Full Name" value={fullName} onChangeText={setFullName} editable={isEditing} />
        <FieldInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          editable={isEditing}
          keyboardType="phone-pad"
        />
        <Row label="Role" value={staff.role} />
        <FieldInput label="Employee ID" value={staff.employee_id ?? ""} editable={false} />
        <FieldInput label="Address" value={address} onChangeText={setAddress} editable={isEditing} />
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
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
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
    </ScrollView>
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
});
