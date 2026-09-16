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

export default function StaffEditProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [emergencyContact, setEmergencyContact] = useState<string>("");
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
      setAddress(data.address ?? "");
      setEmergencyContact(data.emergency_contact ?? "");
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
        address,
        emergency_contact: emergencyContact,
        ...(avatarPath ? { avatar_url: avatarPath } : {}),
      });
      showSuccess("Profile updated");
      router.replace("/(staff)/profile");
    } catch (err: any) {
      showError(err.message);
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton onPress={() => router.replace("/(staff)/profile")} />

      <Text style={styles.title}>Edit Profile</Text>

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" color={COLORS.gold} />
      ) : (
        <>
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

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, focusedField === "fullName" && styles.inputFocused]}
            value={fullName}
            onChangeText={setFullName}
            onFocus={() => setFocusedField("fullName")}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={[styles.input, focusedField === "phone" && styles.inputFocused]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            onFocus={() => setFocusedField("phone")}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, focusedField === "address" && styles.inputFocused]}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setFocusedField("address")}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={[styles.input, focusedField === "emergencyContact" && styles.inputFocused]}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
            onFocus={() => setFocusedField("emergencyContact")}
            onBlur={() => setFocusedField(null)}
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.replace("/(staff)/profile")}
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
        </>
      )}
    </ScrollView>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: COLORS.textPrimary,
  },
  loading: {
    marginTop: 32,
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
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
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
