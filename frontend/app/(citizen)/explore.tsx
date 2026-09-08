import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { List, MapTrifold } from "phosphor-react-native";

import { api, type Issue } from "@/src/api/client";
import { IssueCard } from "@/src/components/IssueCard";
import { LeafletMap } from "@/src/components/LeafletMap";
import { ChipRow, EmptyState, Input, LoadingView } from "@/src/components/ui";
import { CATEGORIES, shortCategory } from "@/src/constants/civic";
import { useGeo } from "@/src/context/geo";
import { useRouter } from "expo-router";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const SCOPES = [
  { label: "Nearby", value: "nearby" },
  { label: "My City", value: "city" },
  { label: "My State", value: "state" },
  { label: "All", value: "all" },
] as const;

const CAT_OPTIONS = [{ label: "All", value: "all" }, ...CATEGORIES.map((c) => ({ label: shortCategory(c), value: c }))];

export default function Explore() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coords, ensureLocation } = useGeo();

  const [scope, setScope] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");

  useEffect(() => {
    ensureLocation();
  }, [ensureLocation]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (scope !== "all" && coords) {
      p.set("scope", scope);
      p.set("lat", String(coords.latitude));
      p.set("lng", String(coords.longitude));
    } else {
      p.set("scope", "all");
      if (coords) {
        p.set("lat", String(coords.latitude));
        p.set("lng", String(coords.longitude));
      }
    }
    if (category !== "all") p.set("category", category);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [scope, category, q, coords]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["issues", "explore", params],
    queryFn: () => api.get<Issue[]>(`/issues?${params}`),
  });

  const issues = data || [];
  const markers = issues.map((i) => ({
    id: i.id,
    lat: i.latitude,
    lng: i.longitude,
    title: i.title,
    category: i.category,
    severity: i.severity,
    status: i.status,
    location_name: i.location_name,
    created_at: i.created_at,
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Pressable
          testID="toggle-view"
          onPress={() => setView((v) => (v === "list" ? "map" : "list"))}
          style={styles.viewToggle}
        >
          {view === "list" ? (
            <MapTrifold size={18} color={colors.onSurface} />
          ) : (
            <List size={18} color={colors.onSurface} />
          )}
          <Text style={styles.viewToggleText}>{view === "list" ? "Map" : "List"}</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Input testID="explore-search" value={q} onChangeText={setQ} placeholder="Search issues or places" />
      </View>
      <ChipRow options={SCOPES as any} value={scope as any} onChange={(v) => setScope(v)} testIDPrefix="scope" />
      <ChipRow options={CAT_OPTIONS as any} value={category as any} onChange={(v) => setCategory(v)} testIDPrefix="cat" />

      {view === "map" ? (
        <View style={styles.mapWrap}>
          <LeafletMap markers={markers} onMarkerPress={(id) => router.push(`/issue/${id}`)} />
        </View>
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(i) => i.id}
          renderItem={({ item, index }) => <IssueCard issue={item} testID={`explore-issue-${index}`} />}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          ListEmptyComponent={
            isLoading ? (
              <LoadingView />
            ) : (
              <EmptyState title="No issues found" subtitle="Try changing the filters or search term." />
            )
          }
        />
      )}
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
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 36,
  },
  viewToggleText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  mapWrap: { flex: 1, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
}));
