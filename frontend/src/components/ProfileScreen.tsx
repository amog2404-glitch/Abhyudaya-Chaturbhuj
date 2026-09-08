import { SignOut, User as UserIcon } from "phosphor-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Divider } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function ProfileScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.avatar}>
            <UserIcon size={28} color={colors.onSurfaceInverse} />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>
              {user?.role === "government" ? "Government Employee" : user?.contributor_type || "Citizen"}
            </Text>
          </View>
        </View>

        {user?.role === "citizen" ? (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.reports_submitted ?? 0}</Text>
              <Text style={styles.statLabel}>Reports submitted</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user?.issues_resolved ?? 0}</Text>
              <Text style={styles.statLabel}>Issues resolved</Text>
            </View>
          </View>
        ) : null}

        <Divider />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>{user?.role === "government" ? "Government" : "Citizen"}</Text>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <Button
            label="Logout"
            variant="outline"
            onPress={logout}
            testID="logout-button"
            left={<SignOut size={18} color={colors.onSurface} />}
          />
        </View>

        <Text style={styles.footerNote}>ABHYUDAYA-CHATURBHUJ · SIH Prototype</Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  card: {
    alignItems: "center",
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  email: { fontSize: 14, color: colors.muted, marginTop: 2 },
  roleTag: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  roleTagText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  statsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  statValue: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  infoLabel: { fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  footerNote: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: spacing.xxl },
}));
