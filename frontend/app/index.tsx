import { Redirect } from "expo-router";
import { View } from "react-native";

import { LoadingView } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <LoadingView />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.role === "government") return <Redirect href="/(gov)/dashboard" />;
  return <Redirect href="/(citizen)/home" />;
}
