import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Issue } from "@/src/api/client";
import { IssueCard } from "@/src/components/IssueCard";
import { Button, EmptyState, LoadingView, SectionHeader } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { useGeo } from "@/src/context/geo";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { coords, ensureLocation, denied } = useGeo();

  useEffect(() => {
    ensureLocation();
  }, [ensureLocation]);

  const scope = coords ? "nearby" : "all";
  const query = coords ? `?scope=nearby&lat=${coords.latitude}&lng=${coords.longitude}` : "?scope=all";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["issues", "home", scope, coords?.latitude, coords?.longitude],
    queryFn: () => api.get<Issue[]>(`/issues${query}`),
  });

  const list = (data || []).slice(0, 8);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>{user?.name ?? "Citizen"}</Text>
        </View>
        <Text style={styles.brand}>ABHYUDAYA</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => <IssueCard issue={item} testID={`home-issue-${index}`} />}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        ListHeaderComponent={
          <View>
            <View style={styles.cta} testID="report-cta">
              <Text style={styles.ctaTitle}>Report a civic issue</Text>
              <Text style={styles.ctaSub}>Help improve your community. It takes less than a minute.</Text>
              <View style={{ marginTop: spacing.lg }}>
                <Button
                  label="Report an Issue"
                  onPress={() => router.push("/(citizen)/report")}
                  testID="home-report-button"
                />
              </View>
            </View>

            <View style={styles.nearbyHeader}>
              <SectionHeader title="Nearby Issues" />
              <Text style={styles.scopeNote}>
                {coords
                  ? "Within ~10 km of your location"
                  : denied
                    ? "Location off · showing all issues"
                    : "Showing all issues"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingView />
          ) : (
            <EmptyState
              title="No issues nearby"
              subtitle="Be the first to report a problem in your area."
              action={<Button label="Report an Issue" onPress={() => router.push("/(citizen)/report")} />}
            />
          )
        }
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { fontSize: 13, color: colors.muted },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  brand: { fontSize: 12, fontWeight: "800", color: colors.onSurface, letterSpacing: 1 },
  cta: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  ctaTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurfaceInverse },
  ctaSub: { fontSize: 14, color: "#B5B5B5", marginTop: spacing.xs, lineHeight: 20 },
  nearbyHeader: { marginBottom: spacing.sm },
  scopeNote: { fontSize: 12, color: colors.muted, marginTop: -6, marginBottom: spacing.md },
}));
