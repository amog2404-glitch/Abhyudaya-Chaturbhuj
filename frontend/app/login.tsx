import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/src/components/toast";
import { Button, Field, Input } from "@/src/components/ui";
import { useAuth } from "@/src/context/auth";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Role = "citizen" | "government";

export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState<Role>("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email.trim() || !password) {
      toast.show("Please enter your email and password.", "error");
      return;
    }
    setLoading(true);
    try {
      const user = await login(email.trim(), password, role);
      router.replace(user.role === "government" ? "/(gov)/dashboard" : "/(citizen)/home");
    } catch (e: any) {
      toast.show(e.message || "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    if (role === "citizen") {
      setEmail("citizen@abhyudaya.in");
      setPassword("citizen123");
    } else {
      setEmail("admin@abhyudaya.in");
      setPassword("admin123");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <View style={styles.logoMark}>
              <Text style={styles.logoDot}>●</Text>
            </View>
            <Text style={styles.appName}>ABHYUDAYA{"\n"}CHATURBHUJ</Text>
            <Text style={styles.tagline}>Solving civic problems through crowdsourcing and AI.</Text>
          </View>

          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            {(["citizen", "government"] as Role[]).map((r) => {
              const active = role === r;
              return (
                <Pressable
                  key={r}
                  testID={`role-${r}`}
                  onPress={() => setRole(r)}
                  style={[styles.roleBtn, active && styles.roleBtnActive]}
                >
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>
                    {r === "citizen" ? "Citizen" : "Government Employee"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.xl }}>
            <Field label="Email">
              <Input
                testID="login-email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <Input
                testID="login-password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            </Field>

            <Button label="Login" onPress={onLogin} loading={loading} testID="login-submit" />

            <Pressable onPress={fillDemo} testID="use-demo" style={styles.demoBox}>
              <Text style={styles.demoTitle}>Use demo {role} account</Text>
              <Text style={styles.demoText}>
                {role === "citizen"
                  ? "citizen@abhyudaya.in · citizen123"
                  : "admin@abhyudaya.in · admin123"}
              </Text>
            </Pressable>
          </View>

          {role === "citizen" ? (
            <Pressable
              testID="go-register"
              onPress={() => router.push("/register")}
              style={styles.registerLink}
            >
              <Text style={styles.registerText}>
                New here? <Text style={styles.registerStrong}>Create Citizen Account</Text>
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.govNote}>
              Government accounts are provisioned by the department and cannot be self-registered.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
  brandBlock: { marginBottom: spacing.xxl },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoDot: { color: colors.brand, fontSize: 20 },
  appName: { fontSize: 26, fontWeight: "800", color: colors.onSurface, letterSpacing: 1, lineHeight: 30 },
  tagline: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
  label: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", gap: spacing.sm },
  roleBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  roleBtnActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  roleText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary, textAlign: "center" },
  roleTextActive: { color: colors.onSurfaceInverse },
  demoBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  demoTitle: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  demoText: { fontSize: 13, color: colors.muted, marginTop: 3 },
  registerLink: { marginTop: spacing.xl, alignItems: "center" },
  registerText: { fontSize: 14, color: colors.muted },
  registerStrong: { color: colors.onSurface, fontWeight: "700" },
  govNote: { marginTop: spacing.xl, fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
}));
