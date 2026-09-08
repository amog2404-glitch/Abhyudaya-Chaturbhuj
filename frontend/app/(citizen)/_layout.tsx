import { Redirect, Tabs } from "expo-router";
import { House, ListChecks, MagnifyingGlass, PlusCircle, User } from "phosphor-react-native";
import { Platform } from "react-native";

import { LoadingView } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useTheme } from "@/src/theme";

export default function CitizenLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) return <LoadingView />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "citizen") return <Redirect href="/(gov)/dashboard" />;

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
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color }) => <House size={22} color={color} weight="regular" /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", tabBarIcon: ({ color }) => <MagnifyingGlass size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: "Report", tabBarIcon: ({ color }) => <PlusCircle size={26} color={color} weight="fill" /> }}
      />
      <Tabs.Screen
        name="my-issues"
        options={{ title: "My Issues", tabBarIcon: ({ color }) => <ListChecks size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
