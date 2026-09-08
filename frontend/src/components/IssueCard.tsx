import { useRouter } from "expo-router";
import { CaretRight, MapPin, ArrowFatUp } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";

import type { Issue } from "@/src/api/client";
import { Badge } from "@/src/components/ui";
import { categoryIcon, severityColor, statusColor } from "@/src/constants/civic";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function IssueCard({ issue, testID }: { issue: Issue; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const Icon = categoryIcon(issue.category);

  return (
    <Pressable
      testID={testID}
      onPress={() => router.push(`/issue/${issue.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Icon size={18} color={colors.onSurface} weight="regular" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {issue.title}
          </Text>
          <View style={styles.locRow}>
            <MapPin size={12} color={colors.muted} weight="fill" />
            <Text style={styles.loc} numberOfLines={1}>
              {issue.location_name}
              {issue.distance_km != null ? `  ·  ${issue.distance_km} km` : ""}
            </Text>
          </View>
        </View>
        <CaretRight size={16} color={colors.muted} />
      </View>

      <View style={styles.badges}>
        <Badge label={issue.severity} color={severityColor(issue.severity, colors)} />
        <Badge label={issue.status} color={statusColor(issue.status, colors)} />
        {issue.is_recurring ? <Badge label="Recurring" color={colors.brand} /> : null}
        <View style={styles.spacer} />
        <View style={styles.upvotes}>
          <ArrowFatUp
            size={14}
            color={issue.has_upvoted ? colors.brand : colors.muted}
            weight={issue.has_upvoted ? "fill" : "regular"}
          />
          <Text style={styles.upvoteText}>{issue.upvote_count}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.7 },
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700", color: colors.onSurface, lineHeight: 20 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  loc: { fontSize: 12, color: colors.muted, flex: 1 },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  spacer: { flex: 1 },
  upvotes: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvoteText: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
}));
