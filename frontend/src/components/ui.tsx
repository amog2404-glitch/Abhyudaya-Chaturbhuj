import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// ---- Button ----------------------------------------------------------------
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
  left,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  left?: ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? styles.btnPrimary
      : variant === "danger"
        ? styles.btnDanger
        : variant === "outline"
          ? styles.btnOutline
          : styles.btnSecondary;
  const txt =
    variant === "outline"
      ? { color: colors.onSurface }
      : variant === "secondary"
        ? { color: colors.onBrandSecondary }
        : { color: colors.onBrandPrimary };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.btn, bg, isDisabled && styles.btnDisabled, pressed && styles.btnPressed]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.onSurface : colors.onBrandPrimary} />
      ) : (
        <View style={styles.btnInner}>
          {left}
          <Text style={[styles.btnLabel, txt]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---- Badge -----------------------------------------------------------------
export function Badge({ label, color, testID }: { label: string; color: string; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, { borderColor: color }]} testID={testID}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ---- Chip row (horizontal scroll) ------------------------------------------
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: readonly T[] | { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}) {
  const styles = useStyles();
  const normalized = options.map((o: any) =>
    typeof o === "string" ? { label: o, value: o } : o,
  ) as { label: string; value: T }[];
  return (
    <View style={styles.chipRowWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRowContent}
      >
        {normalized.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
              onPress={() => onChange(o.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ---- Section header --------------------------------------------------------
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.empty} testID="empty-state">
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function LoadingView() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }} testID="loading-view">
      <ActivityIndicator color={colors.onSurface} />
    </View>
  );
}

// ---- Labeled field ---------------------------------------------------------
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnSecondary: { backgroundColor: colors.brandSecondary },
  btnDanger: { backgroundColor: colors.error },
  btnOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnLabel: { fontSize: 15, fontWeight: "700" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  chipRowWrap: { height: 56, justifyContent: "center" },
  chipRowContent: { gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.onSurfaceTertiary },
  chipTextActive: { color: colors.onSurfaceInverse },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, letterSpacing: 0.2 },

  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },

  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6 },

  field: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.onSurface,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top", paddingTop: 12 },
}));
