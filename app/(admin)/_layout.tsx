import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Stack, Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { COLORS, SPACING, RADIUS } from "../../src/constants/theme";

const NAV_ITEMS = [
  { name: "dashboard", label: "Dashboard", icon: "grid-outline" as const, href: "/(admin)/dashboard" as const },
  { name: "staff", label: "Staff", icon: "people-outline" as const, href: "/(admin)/staff" as const },
  { name: "clients", label: "Clients", icon: "briefcase-outline" as const, href: "/(admin)/clients" as const },
  { name: "sites", label: "Sites", icon: "business-outline" as const, href: "/(admin)/sites" as const },
  { name: "settings", label: "Settings", icon: "settings-outline" as const, href: "/(admin)/settings" as const },
];

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarTop}>
        <Image
          source={require("../../assets/brothers_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.divider} />
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === `/${item.name}`;
          const color = active ? COLORS.gold : COLORS.textSecondary;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href)}
            >
              <Ionicons name={item.icon} size={18} color={color} />
              <Text style={[styles.navLabel, { color }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sidebarBottom}>
        <View style={styles.divider} />
        <Text style={styles.version}>v{Constants.expoConfig?.version ?? "1.0.0"}</Text>
      </View>
    </View>
  );
}

function SidebarLayout() {
  return (
    <View style={styles.root}>
      <Sidebar />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="staff/[id]" />
      <Stack.Screen name="staff/invite" />
      <Stack.Screen name="clients/[id]" />
      <Stack.Screen name="clients/invite" />
      <Stack.Screen name="sites/[id]" />
      <Stack.Screen name="sites/create" />
      <Stack.Screen name="settings/edit-profile" />
    </Stack>
  );
}

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return isDesktop ? <SidebarLayout /> : <StackLayout />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
  sidebar: {
    width: 220,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 24,
  },
  sidebarTop: {
    paddingHorizontal: 20,
    marginBottom: SPACING.md,
  },
  logo: {
    width: 140,
    height: 62,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.3,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopRightRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    borderLeftWidth: 2,
    borderLeftColor: "transparent",
  },
  navItemActive: {
    backgroundColor: COLORS.accentBg,
    borderLeftColor: COLORS.gold,
  },
  navLabel: {
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sidebarBottom: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  version: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
});
