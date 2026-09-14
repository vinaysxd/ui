import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from "react-native";
import { Stack, Slot, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const NAV_ITEMS = [
  { name: "dashboard", label: "Home", icon: "home-outline" as const, href: "/(staff)/dashboard" as const },
  { name: "sites", label: "Sites", icon: "location-outline" as const, href: "/(staff)/sites" as const },
  { name: "profile", label: "Profile", icon: "person-outline" as const, href: "/(staff)/profile" as const },
];

function Sidebar() {
  console.log("THIS IS STAFF ROOT LAYOUT")
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
      <Stack.Screen name="site/[id]" />
      <Stack.Screen name="profile/edit" />
    </Stack>
  );
}

export default function StaffLayout() {
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
