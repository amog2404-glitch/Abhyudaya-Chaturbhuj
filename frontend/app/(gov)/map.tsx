import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Issue } from "@/src/api/client";
import { LeafletMap } from "@/src/components/LeafletMap";
import { ChipRow, LoadingView } from "@/src/components/ui";
import { CATEGORIES, SEVERITIES, STATUSES, shortCategory } from "@/src/constants/civic";
import { makeStyles, spacing, useTheme } from "@/src/theme";

const CAT = [{ label: "All", value: "all" }, ...CATEGORIES.map((c) => ({ label: shortCategory(c), value: c }))];
const SEV = [{ label: "All", value: "all" }, ...SEVERITIES.map((s) => ({ label: s, value: s }))];
const STAT = [{ label: "All", value: "all" }, ...STATUSES.map((s) => ({ label: s, value: s }))];

export default function GovMap() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["issues", "govmap"],
    queryFn: () => api.get<Issue[]>("/issues?scope=all"),
  });

  const markers = useMemo(() => {
    return (data || [])
      .filter((i) => category === "all" || i.category === category)
      .filter((i) => severity === "all" || i.severity === severity)
      .filter((i) => status === "all" || i.status === status)
      .map((i) => ({
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
  }, [data, category, severity, status]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Issue Map</Text>
        <Text style={styles.count}>{markers.length} issues</Text>
      </View>
      <ChipRow options={CAT as any} value={category as any} onChange={setCategory} testIDPrefix="gmap-cat" />
      <ChipRow options={SEV as any} value={severity as any} onChange={setSeverity} testIDPrefix="gmap-sev" />
      <ChipRow options={STAT as any} value={status as any} onChange={setStatus} testIDPrefix="gmap-stat" />
      <View style={styles.mapWrap}>
        {isLoading ? (
          <LoadingView />
        ) : (
          <LeafletMap markers={markers} onMarkerPress={(id) => router.push(`/issue/${id}`)} />
        )}
      </View>
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
  count: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  mapWrap: { flex: 1, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
}));
