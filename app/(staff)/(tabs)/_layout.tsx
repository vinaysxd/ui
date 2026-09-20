import { useWindowDimensions } from "react-native";
import { Tabs, Slot } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../src/constants/theme";

const NAV_ITEMS = [
  { name: "dashboard", label: "Home", icon: "home-outline" as const },
  { name: "sites", label: "Sites", icon: "location-outline" as const },
  { name: "profile", label: "Profile", icon: "person-outline" as const },
];

const getTabBarStyle = (insets: { bottom: number }) => ({
  display: "flex" as const,
  flexDirection: "row" as const,
  justifyContent: "space-around" as const,
  width: "100%" as const,
  backgroundColor: COLORS.surface,
  borderTopColor: COLORS.border,
  borderTopWidth: 1,
  height: 60 + insets.bottom,
  paddingBottom: insets.bottom,
  paddingTop: 8,
});

const TAB_BAR_ITEM_STYLE = {
  flex: 1,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

const TAB_BAR_LABEL_STYLE = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  fontWeight: "600" as const,
  marginBottom: 4,
};

export default function StaffTabsGroupLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;

  if (isDesktop) {
    return <Slot />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: getTabBarStyle(insets),
        tabBarItemStyle: TAB_BAR_ITEM_STYLE,
        tabBarLabelStyle: TAB_BAR_LABEL_STYLE,
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
