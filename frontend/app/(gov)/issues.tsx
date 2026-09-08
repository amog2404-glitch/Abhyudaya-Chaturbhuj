import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Issue } from "@/src/api/client";
import { IssueCard } from "@/src/components/IssueCard";
import { ChipRow, EmptyState, LoadingView } from "@/src/components/ui";
import { CATEGORIES, SEVERITIES, STATUSES, shortCategory } from "@/src/constants/civic";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const CAT = [{ label: "All", value: "all" }, ...CATEGORIES.map((c) => ({ label: shortCategory(c), value: c }))];
const SEV = [{ label: "All", value: "all" }, ...SEVERITIES.map((s) => ({ label: s, value: s }))];
const STAT = [{ label: "All", value: "all" }, ...STATUSES.map((s) => ({ label: s, value: s }))];

export default function GovIssues() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"priority" | "recent">("priority");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["issues", "govissues", sort],
    queryFn: () => api.get<Issue[]>(`/issues?scope=all&sort=${sort}`),
  });

  const issues = useMemo(
    () =>
      (data || [])
        .filter((i) => category === "all" || i.category === category)
        .filter((i) => severity === "all" || i.severity === severity)
        .filter((i) => status === "all" || i.status === status),
    [data, category, severity, status],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>All Issues</Text>
        <View style={styles.sortRow}>
          {(["priority", "recent"] as const).map((s) => (
            <Pressable
              key={s}
              testID={`sort-${s}`}
              onPress={() => setSort(s)}
              style={[styles.sortBtn, sort === s && styles.sortActive]}
            >
              <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
                {s === "priority" ? "Priority" : "Recent"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ChipRow options={CAT as any} value={category as any} onChange={setCategory} testIDPrefix="gi-cat" />
      <ChipRow options={SEV as any} value={severity as any} onChange={setSeverity} testIDPrefix="gi-sev" />
      <ChipRow options={STAT as any} value={status as any} onChange={setStatus} testIDPrefix="gi-stat" />

      <FlatList
        data={issues}
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => <IssueCard issue={item} testID={`gov-issue-${index}`} />}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        ListEmptyComponent={
          isLoading ? <LoadingView /> : <EmptyState title="No issues match these filters" />
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
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  sortRow: { flexDirection: "row", gap: spacing.sm },
  sortBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 34,
    justifyContent: "center",
  },
  sortActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  sortText: { fontSize: 12, fontWeight: "700", color: colors.onSurfaceTertiary },
  sortTextActive: { color: colors.onSurfaceInverse },
}));
