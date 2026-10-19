import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { THEME_MODE, COLORS, SPACING, RADIUS } from "../../src/constants/theme";

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
        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/brothers.jpg")}
            style={styles.favicon}
            resizeMode="cover"
          />
          {/* <Text style={styles.brandText}>BROTHERS</Text> */}
        </View>
        <View style={styles.divider} />
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const active =
            item.name === "dashboard"
              ? pathname === "/" || pathname === "/dashboard"
              : pathname.startsWith(`/${item.name}`);
          const color = active ? COLORS.gold : COLORS.textSecondary;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.replace(item.href)}
            >
              <Ionicons name={item.icon} size={20} color={color} />
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar backgroundColor={COLORS.surface} barStyle={THEME_MODE === "dark" ? "light-content" : "dark-content"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="staff/[id]" />
        <Stack.Screen name="staff/invite" />
        <Stack.Screen name="clients/[id]" />
        <Stack.Screen name="clients/invite" />
        <Stack.Screen name="sites/[id]" />
        <Stack.Screen name="sites/create" />
      </Stack>
    </SafeAreaView>
  );
}

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return isDesktop ? <SidebarLayout /> : <StackLayout />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  root: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.surface,
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: SPACING.md,
  },
  favicon: {
    marginTop:20,
    width: 180,
    height:80,
    borderRadius: 8,
  },
  brandText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
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
    borderRadius: RADIUS.md,
  },
  navItemActive: {
    backgroundColor: COLORS.accentBg,
  },
  navLabel: {
    fontSize: 16,
    letterSpacing: 0.3,
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
