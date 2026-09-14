import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Stack, Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
      <Text style={styles.logo}>Brothers Cleaning</Text>
      {NAV_ITEMS.map((item) => {
        const active = pathname === `/${item.name}`;
        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.navItem, active && styles.navItemActive]}
            onPress={() => router.push(item.href)}
          >
            <Ionicons name={item.icon} size={20} color={active ? "#fff" : "#999"} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
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
    backgroundColor: "#f5f5f5",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
    paddingTop: 24,
    paddingHorizontal: 12,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#000",
  },
  navLabel: {
    fontSize: 15,
    color: "#999",
  },
  navLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
