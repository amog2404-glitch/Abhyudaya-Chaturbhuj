import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Warning } from "phosphor-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { LoadingView, SectionHeader } from "@/src/components/ui";
import { severityColor, shortCategory } from "@/src/constants/civic";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Recurring = {
  category: string;
  area_name: string;
  report_count: number;
  time_window_days: number;
  suggested_action: string;
  issue_ids: string[];
};

type Insights = {
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  trend: { label: string; count: number }[];
  recurring: Recurring[];
};

export default function InsightsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, isLoading } = useQuery({ queryKey: ["insights"], queryFn: () => api.get<Insights>("/insights") });

  if (isLoading || !data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Civic Intelligence</Text>
        </View>
        <LoadingView />
      </View>
    );
  }

  const catEntries = Object.entries(data.by_category).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...catEntries.map((e) => e[1]));
  const trendMax = Math.max(1, ...data.trend.map((t) => t.count));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Civic Intelligence</Text>
        <Text style={styles.subtitle}>What is happening repeatedly and where to focus.</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Recurring problems */}
        <SectionHeader title="Recurring Problems" />
        {data.recurring.length === 0 ? (
          <Text style={styles.emptyText}>No recurring clusters detected yet.</Text>
        ) : (
          data.recurring.map((r, i) => (
            <View key={i} style={styles.recCard} testID={`recurring-${i}`}>
              <View style={styles.recTop}>
                <Warning size={18} color={colors.brand} weight="fill" />
                <Text style={styles.recDetected}>Recurring Problem Detected</Text>
              </View>
              <Text style={styles.recTitle}>{r.category}</Text>
              <View style={styles.recMetaRow}>
                <RecMeta label="Reports" value={String(r.report_count)} />
                <RecMeta label="Area" value={r.area_name} />
                <RecMeta label="Window" value={`${r.time_window_days}d`} />
              </View>
              <Text style={styles.recAction}>{r.suggested_action}</Text>
              <Text
                style={styles.recLink}
                onPress={() => r.issue_ids[0] && router.push(`/issue/${r.issue_ids[0]}`)}
                testID={`recurring-inspect-${i}`}
              >
                Inspect {r.report_count} underlying reports →
              </Text>
            </View>
          ))
        )}

        {/* By category */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Issues by Category" />
          {catEntries.map(([cat, count]) => (
            <BarRow key={cat} label={shortCategory(cat)} count={count} max={catMax} color={colors.onSurface} />
          ))}
        </View>

        {/* By severity */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Issues by Severity" />
          {Object.entries(data.by_severity).map(([sev, count]) => (
            <BarRow
              key={sev}
              label={sev}
              count={count}
              max={Math.max(1, ...Object.values(data.by_severity))}
              color={severityColor(sev, colors)}
            />
          ))}
        </View>

        {/* By status */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Issues by Status" />
          {Object.entries(data.by_status).map(([st, count]) => (
            <BarRow
              key={st}
              label={st}
              count={count}
              max={Math.max(1, ...Object.values(data.by_status))}
              color={colors.onSurfaceTertiary}
            />
          ))}
        </View>

        {/* Trend */}
        <View style={{ marginTop: spacing.xl }}>
          <SectionHeader title="Reports Over Time" />
          <View style={styles.trend}>
            {data.trend.map((t) => (
              <View key={t.label} style={styles.trendCol}>
                <View style={styles.trendBarTrack}>
                  <View
                    style={[styles.trendBar, { height: `${(t.count / trendMax) * 100}%` }]}
                  />
                </View>
                <Text style={styles.trendCount}>{t.count}</Text>
                <Text style={styles.trendLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function RecMeta({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.recMeta}>
      <Text style={styles.recMetaLabel}>{label}</Text>
      <Text style={styles.recMetaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.bar, { width: `${(count / max) * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
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
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  emptyText: { fontSize: 13, color: colors.muted },
  recCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  recTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  recDetected: { fontSize: 12, fontWeight: "800", color: colors.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  recTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  recMetaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  recMeta: { flex: 1 },
  recMetaLabel: { fontSize: 11, color: colors.muted },
  recMetaValue: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: 2 },
  recAction: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: spacing.md, lineHeight: 19 },
  recLink: { fontSize: 13, fontWeight: "700", color: colors.brand, marginTop: spacing.md },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  barLabel: { width: 90, fontSize: 12, color: colors.onSurfaceTertiary },
  barTrack: { flex: 1, height: 18, backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.sm },
  barCount: { width: 24, textAlign: "right", fontSize: 13, fontWeight: "700", color: colors.onSurface },
  trend: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    gap: spacing.sm,
  },
  trendCol: { flex: 1, alignItems: "center" },
  trendBarTrack: { width: "100%", height: 90, justifyContent: "flex-end", alignItems: "center" },
  trendBar: { width: "70%", backgroundColor: colors.onSurface, borderRadius: radius.sm, minHeight: 3 },
  trendCount: { fontSize: 12, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
  trendLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
}));
