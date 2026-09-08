import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, type Issue } from "@/src/api/client";
import { IssueCard } from "@/src/components/IssueCard";
import { LoadingView, SectionHeader } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Stats = {
  total: number;
  by_status: Record<string, number>;
  high_critical: number;
  recurring_count: number;
  priority_issues: Issue[];
};

export default function Dashboard() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["stats"],
    queryFn: () => api.get<Stats>("/stats"),
  });

  const metrics = data
    ? [
        { label: "Total Issues", value: data.total, dark: true },
        { label: "Reported", value: data.by_status["Reported"] ?? 0 },
        { label: "In Progress", value: data.by_status["In Progress"] ?? 0 },
        { label: "Resolved", value: data.by_status["Resolved"] ?? 0 },
        { label: "High / Critical", value: data.high_critical, accent: true },
        { label: "Recurring", value: data.recurring_count },
      ]
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Government Dashboard</Text>
        <Text style={styles.name}>{user?.name}</Text>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <ScrollView
          onScrollBeginDrag={() => {}}
          refreshControl={undefined}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        >
          <SectionHeader title="Civic Overview" />
          <View style={styles.grid}>
            {metrics.map((m) => (
              <View
                key={m.label}
                style={[styles.metric, m.dark && styles.metricDark]}
                testID={`metric-${m.label}`}
              >
                <Text style={[styles.metricValue, m.dark && styles.metricValueDark, m.accent && styles.metricAccent]}>
                  {m.value}
                </Text>
                <Text style={[styles.metricLabel, m.dark && styles.metricLabelDark]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <SectionHeader title="Priority Issues" />
            {(data?.priority_issues || []).map((issue, i) => (
              <IssueCard key={issue.id} issue={issue} testID={`priority-issue-${i}`} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  name: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metric: {
    width: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  metricDark: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  metricValue: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  metricValueDark: { color: colors.onSurfaceInverse },
  metricAccent: { color: colors.brand },
  metricLabel: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: "600" },
  metricLabelDark: { color: "#B5B5B5" },
}));
