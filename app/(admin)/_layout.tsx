import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { Tabs, Slot, usePathname, useRouter } from "expo-router";
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
            <Ionicons name={item.icon} size={20} color={active ? "#fff" : "#000"} />
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

function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#999",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.label,
            tabBarIcon: ({ color, size }) => <Ionicons name={item.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function AdminLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" || width > 768;

  return isDesktop ? <SidebarLayout /> : <TabsLayout />;
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
    color: "#000",
  },
  navLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
