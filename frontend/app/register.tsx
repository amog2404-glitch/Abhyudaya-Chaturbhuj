import { useRouter } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/src/components/toast";
import { Button, ChipRow, Field, Input } from "@/src/components/ui";
import { CONTRIBUTOR_TYPES } from "@/src/constants/civic";
import { useAuth } from "@/src/context/auth";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function Register() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { register } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ctype, setCtype] = useState<string>("Citizen");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (name.trim().length < 2) return toast.show("Please enter your name.", "error");
    if (!email.trim()) return toast.show("Please enter your email.", "error");
    if (password.length < 6) return toast.show("Password must be at least 6 characters.", "error");
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, ctype);
      router.replace("/(citizen)/home");
    } catch (e: any) {
      toast.show(e.message || "Registration failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="register-back">
          <CaretLeft size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Citizen Account</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Full name">
            <Input testID="reg-name" value={name} onChangeText={setName} placeholder="Your name" />
          </Field>
          <Field label="Email">
            <Input
              testID="reg-email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
              testID="reg-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
          </Field>

          <Text style={styles.ctypeLabel}>I am contributing as</Text>
          <ChipRow options={CONTRIBUTOR_TYPES} value={ctype as any} onChange={(v) => setCtype(v)} testIDPrefix="ctype" />

          <View style={{ marginTop: spacing.xl }}>
            <Button label="Create account" onPress={onSubmit} loading={loading} testID="reg-submit" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  ctypeLabel: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
}));
