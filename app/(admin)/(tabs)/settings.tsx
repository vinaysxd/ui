import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  AppState,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { getProfile, updateProfile, uploadAvatar, ProfileMe } from "../../../src/services/profile.service";
import { logout } from "../../../src/services/auth.service";
import { showSuccess, showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";
import { getErrorMessage } from "../../../src/constants/errors";
import api from "../../../src/lib/api";

const QB_GREEN = "#2CA01C";

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

export default function SettingsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [profile, setProfile] = useState<ProfileMe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const [qbConnected, setQbConnected] = useState<boolean>(false);
  const [qbLoading, setQbLoading] = useState<boolean>(true);
  const [qbActionLoading, setQbActionLoading] = useState<boolean>(false);
  const qbPendingConnect = useRef<boolean>(false);

  const applyFieldsFromProfile = (data: ProfileMe) => {
    setFullName(data.full_name ?? "");
    setPhone(data.phone ?? "");
    setAvatarUrl(data.avatar_url ?? "");
  };

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      applyFieldsFromProfile(data);
      setAvatarPreviewUri(null);
      setAvatarLoadFailed(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const fetchQbStatus = useCallback(async () => {
    setQbLoading(true);
    try {
      const response = await api.get("/integrations/quickbooks/status");
      setQbConnected(!!response.data?.connected);
    } catch (err: any) {
      setQbConnected(false);
    } finally {
      setQbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQbStatus();
  }, [fetchQbStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && qbPendingConnect.current) {
        qbPendingConnect.current = false;
        fetchQbStatus();
      }
    });
    return () => subscription.remove();
  }, [fetchQbStatus]);

  const handleConnectQb = async () => {
    setQbActionLoading(true);
    qbPendingConnect.current = true;
    try {
      const url = `${api.defaults.baseURL}/integrations/quickbooks/connect`;
      await WebBrowser.openBrowserAsync(url);
    } catch (err: any) {
      showError(err.message ?? "Failed to open QuickBooks connection");
    } finally {
      setQbActionLoading(false);
      await fetchQbStatus();
    }
  };

  const handleDisconnectQb = async () => {
    setQbActionLoading(true);
    try {
      await api.post("/integrations/quickbooks/disconnect");
      setQbConnected(false);
      showSuccess("QuickBooks disconnected");
    } catch (err: any) {
      const code = err?.response?.data?.code;
      showError(getErrorMessage(code));
    } finally {
      setQbActionLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/auth/login");
    } catch (err: any) {
      showError(err.message);
      setLoggingOut(false);
    }
  };

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
      setAvatarUrl(uploadedPath);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      applyFieldsFromProfile(profile);
    }
    setAvatarPreviewUri(null);
    setAvatarLoadFailed(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      await fetchProfile();
      setIsEditing(false);
      showSuccess("Profile updated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const topAvatarUri = avatarPreviewUri ?? profile?.signed_avatar_url ?? null;

  const content = (
    <View style={styles.maxWidthWrap}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title}>Your Account</Text>
      </View>

      {profile ? (
        <View style={styles.profileCard}>
          {topAvatarUri && !avatarLoadFailed ? (
            <Image
              source={{ uri: topAvatarUri }}
              style={styles.avatarImage}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(fullName || profile.full_name)}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{profile.full_name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile.role}</Text>
          </View>

          {isEditing ? (
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={handleChangePhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.gold} />
              ) : (
                <Text style={styles.changePhotoButtonText}>Change Photo</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <View style={styles.fieldsBlock}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={[styles.input, isEditing && styles.inputEditing]}
              value={fullName}
              onChangeText={setFullName}
              editable={isEditing}
              placeholder="—"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={[styles.input, isEditing && styles.inputEditing]}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="—"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLabel}>Avatar URL</Text>
            <TextInput
              style={[styles.input, isEditing && styles.inputEditing]}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              editable={isEditing}
              autoCapitalize="none"
              placeholder="—"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {isEditing ? (
            <View style={styles.editActionsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#1A1A1A" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>App</Text>
      <View style={styles.section}>
        <SettingsRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        <SettingsRow label="API URL" value={api.defaults.baseURL ?? "—"} last />
      </View>

      <Text style={styles.sectionLabel}>QuickBooks</Text>
      <View style={styles.section}>
        {qbLoading ? (
          <View style={styles.qbLoadingRow}>
            <ActivityIndicator color={COLORS.gold} size="small" />
          </View>
        ) : qbConnected ? (
          <View style={styles.qbRow}>
            <View style={styles.qbStatusLeft}>
              <View style={styles.qbStatusDot} />
              <Text style={styles.qbStatusText}>Connected to QuickBooks</Text>
            </View>
            <TouchableOpacity
              style={styles.qbDisconnectButton}
              onPress={handleDisconnectQb}
              disabled={qbActionLoading}
            >
              {qbActionLoading ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <Text style={styles.qbDisconnectButtonText}>Disconnect</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qbConnectWrap}>
            <Text style={styles.qbHintText}>
              Connect QuickBooks to sync invoices and billing for clients.
            </Text>
            <TouchableOpacity
              style={styles.qbConnectButton}
              onPress={handleConnectQb}
              disabled={qbActionLoading}
            >
              {qbActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.qbConnectButtonText}>Connect QuickBooks</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.sectionLabel}>Danger Zone</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loggingOut}>
        {loggingOut ? (
          <ActivityIndicator color={COLORS.danger} />
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (isDesktop) {
    return (
      <LinearGradient colors={["#1A1A1A", "#0D0D0D"]} style={styles.desktopScreen}>
        <View style={styles.desktopCard}>
          <ScrollView contentContainerStyle={styles.webContent}>{content}</ScrollView>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.mobileScreen}>
      <ScrollView contentContainerStyle={styles.mobileContent}>{content}</ScrollView>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const rowContent = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLeft}>
        {icon ? <Ionicons name={icon} size={18} color={COLORS.gold} /> : null}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      )}
    </View>
  );

  if (!onPress) {
    return rowContent;
  }

  return <TouchableOpacity onPress={onPress}>{rowContent}</TouchableOpacity>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: "#3A3520",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "700",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  profileEmail: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 10,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  roleBadgeText: {
    color: "#1A1A1A",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  changePhotoButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  changePhotoButtonText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "600",
  },
  fieldsBlock: {
    width: "100%",
    marginTop: 20,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  inputEditing: {
    borderColor: COLORS.gold,
  },
  editButton: {
    width: "100%",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20,
  },
  editButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 14,
  },
  editActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#1A1A1A",
    fontWeight: "700",
    fontSize: 14,
  },
  sectionLabel: {
    color: COLORS.gold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  section: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: 24,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  rowValue: {
    color: COLORS.textMuted,
    fontSize: 14,
    flexShrink: 1,
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: COLORS.dangerBg,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontWeight: "bold",
  },

  qbLoadingRow: {
    paddingVertical: 16,
    alignItems: "center",
  },
  qbRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  qbStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  qbStatusDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
  },
  qbStatusText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  qbDisconnectButton: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  qbDisconnectButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  qbConnectWrap: {
    padding: 16,
  },
  qbHintText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 14,
  },
  qbConnectButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: QB_GREEN,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  qbConnectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Web: floating dark card on gradient background
  desktopScreen: {
    flex: 1,
  },
  desktopCard: {
    flex: 1,
    margin: 24, 
    borderRadius: RADIUS.xl,
     
    elevation: 8,
  },
  webContent: {
    padding: 28,
    width: "100%",
  },
  maxWidthWrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  mobileScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
