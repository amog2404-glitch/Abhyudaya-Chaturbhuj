import { Redirect, Tabs } from "expo-router";
import { ChartBar, Lightning, MapTrifold, Stack as StackIcon, User } from "phosphor-react-native";
import { Platform } from "react-native";

import { LoadingView } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useTheme } from "@/src/theme";

export default function GovLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "government") return <Redirect href="/(citizen)/home" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: ({ color }) => <ChartBar size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: "Map", tabBarIcon: ({ color }) => <MapTrifold size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="issues"
        options={{ title: "Issues", tabBarIcon: ({ color }) => <StackIcon size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: "Insights", tabBarIcon: ({ color }) => <Lightning size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
