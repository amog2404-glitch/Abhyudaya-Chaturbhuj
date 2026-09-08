import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

import { api, type Issue } from "@/src/api/client";
import { IssueCard } from "@/src/components/IssueCard";
import { ChipRow, EmptyState, LoadingView } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Reported", value: "Reported" },
  { label: "In Progress", value: "In Progress" },
  { label: "Resolved", value: "Resolved" },
];

export default function MyIssues() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["issues", "mine"],
    queryFn: () => api.get<Issue[]>("/issues?mine=true"),
  });

  const issues = (data || []).filter((i) => filter === "all" || i.status === filter);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Issues</Text>
      </View>
      <ChipRow options={FILTERS as any} value={filter as any} onChange={setFilter} testIDPrefix="myfilter" />
      <FlatList
        data={issues}
        keyExtractor={(i) => i.id}
        renderItem={({ item, index }) => <IssueCard issue={item} testID={`myissue-${index}`} />}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        ListEmptyComponent={
          isLoading ? (
            <LoadingView />
          ) : (
            <EmptyState title="No issues yet" subtitle="Issues you report will appear here." />
          )
        }
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
}));
