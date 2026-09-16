import { useCallback, useEffect, useState } from "react";
import {
  Text,
  TextInput,
  Image,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getProfile, updateProfile, uploadAvatar } from "../../../src/services/profile.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";

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

export default function ClientEditProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [contactPerson, setContactPerson] = useState<string>("");
  const [avatarPath, setAvatarPath] = useState<string>("");
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      setFullName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setCompanyName(data.company_name ?? "");
      setBillingAddress(data.billing_address ?? "");
      setContactPerson(data.contact_person ?? "");
      setAvatarPath(data.avatar_url ?? "");
      setAvatarPreviewUri(data.signed_avatar_url ?? null);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChangePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError("Permission to access photos is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setAvatarLoadFailed(false);
    setAvatarPreviewUri(result.assets[0].uri);

    setUploading(true);
    try {
      const uploadedPath = await uploadAvatar(result.assets[0].uri);
      setAvatarPath(uploadedPath);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        company_name: companyName,
        billing_address: billingAddress,
        contact_person: contactPerson,
        ...(avatarPath ? { avatar_url: avatarPath } : {}),
      });
      showSuccess("Profile updated");
      router.replace("/(client)/profile");
    } catch (err: any) {
      showError(err.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.replace("/(client)/profile")} />

      <Text style={styles.eyebrow}>EDIT</Text>
      <Text style={styles.title}>Edit Profile</Text>

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color={COLORS.gold} />
      ) : (
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            {avatarPreviewUri && !avatarLoadFailed ? (
              <Image
                source={{ uri: avatarPreviewUri }}
                style={styles.avatarImage}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{getInitials(fullName)}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={handleChangePhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={COLORS.gold} size="small" />
              ) : (
                <Text style={styles.changePhotoButtonText}>Change Photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <FormField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            focused={focusedField === "fullName"}
            onFocus={() => setFocusedField("fullName")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            focused={focusedField === "phone"}
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Company Name"
            value={companyName}
            onChangeText={setCompanyName}
            focused={focusedField === "companyName"}
            onFocus={() => setFocusedField("companyName")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Billing Address"
            value={billingAddress}
            onChangeText={setBillingAddress}
            focused={focusedField === "billingAddress"}
            onFocus={() => setFocusedField("billingAddress")}
            onBlur={() => setFocusedField(null)}
          />

          <FormField
            label="Contact Person"
            value={contactPerson}
            onChangeText={setContactPerson}
            focused={focusedField === "contactPerson"}
            onFocus={() => setFocusedField("contactPerson")}
            onBlur={() => setFocusedField(null)}
            last
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.replace("/(client)/profile")}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  focused,
  onFocus,
  onBlur,
  keyboardType,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  keyboardType?: "default" | "phone-pad";
  last?: boolean;
}) {
  return (
    <View style={!last ? styles.fieldSpacing : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
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
      <Ionicons name="arrow-back" size={22} color={COLORS.gold} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  loading: {
    marginTop: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    padding: 24,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: "bold",
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  changePhotoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
  },
  fieldSpacing: {
    marginBottom: 16,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: COLORS.gold,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#1A1A1A",
    fontWeight: "bold",
  },
});
