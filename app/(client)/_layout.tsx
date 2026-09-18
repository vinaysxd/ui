import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Stack, Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { COLORS, SPACING, RADIUS } from "../../src/constants/theme";

const NAV_ITEMS = [
  { name: "dashboard", label: "Home", icon: "home-outline" as const, href: "/(client)/dashboard" as const },
  { name: "sites", label: "Sites", icon: "location-outline" as const, href: "/(client)/sites" as const },
  { name: "billing", label: "Billing", icon: "receipt-outline" as const, href: "/(client)/billing" as const },
  { name: "profile", label: "Profile", icon: "person-outline" as const, href: "/(client)/profile" as const },
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
          <Text style={styles.brandText}>BROTHERS</Text>
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
      <Stack.Screen name="site/[id]" />
      <Stack.Screen name="profile/edit" />
    </Stack>
  );
}

export default function ClientLayout() {
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
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: SPACING.md,
  },
  favicon: {
    width: 40,
    height: 40,
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
