import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { getProfile, ProfileMe } from "../../../src/services/profile.service";
import { logout } from "../../../src/services/auth.service";
import { showError } from "../../../src/utils/toast";
import { COLORS, RADIUS } from "../../../src/constants/theme";
import api from "../../../src/lib/api";

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

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  const content = (
    <View style={styles.maxWidthWrap}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SETTINGS</Text>
        <Text style={styles.title}>Your Account</Text>
      </View>

      {profile ? (
        <View style={styles.profileCard}>
          {profile.avatar_url && !avatarLoadFailed ? (
            <Image
              source={{ uri: profile.signed_avatar_url ?? undefined }}
              style={styles.avatarImage}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(profile.full_name)}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{profile.full_name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{profile.role}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.section}>
        <SettingsRow
          icon="person-outline"
          label="Edit Profile"
          onPress={() => router.push("/(admin)/settings/edit-profile")}
          last
        />
      </View>

      <Text style={styles.sectionLabel}>App</Text>
      <View style={styles.section}>
        <SettingsRow label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        <SettingsRow label="API URL" value={api.defaults.baseURL ?? "—"} last />
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
    maxWidth: 1200,
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
