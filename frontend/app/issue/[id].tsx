import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowFatUp, CaretLeft, HandHeart, MapPin, ThumbsUp } from "phosphor-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, fileUrl, type Issue } from "@/src/api/client";
import { LeafletMap } from "@/src/components/LeafletMap";
import { useToast } from "@/src/components/toast";
import { Badge, Button, ChipRow, Divider, Input, LoadingView, SectionHeader } from "@/src/components/ui";
import { categoryIcon, priorityColor, severityColor, statusColor, STATUSES } from "@/src/constants/civic";
import { useAuth } from "@/src/context/auth";
import { queryClient } from "@/src/query-client";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Suggestion = {
  id: string;
  author_name: string;
  contributor_type: string;
  title: string;
  description: string;
  approach?: string | null;
  helpful_count: number;
  created_at: string;
};

const PRESETS = [50, 100, 250, 500];

export default function IssueDetails() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isGov = user?.role === "government";

  const [donateOpen, setDonateOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const issueQ = useQuery({ queryKey: ["issue", id], queryFn: () => api.get<Issue>(`/issues/${id}`) });
  const suggQ = useQuery({ queryKey: ["suggestions", id], queryFn: () => api.get<Suggestion[]>(`/issues/${id}/suggestions`) });
  const donQ = useQuery({
    queryKey: ["donations", id],
    queryFn: () => api.get<{ total: number; contributors: number }>(`/issues/${id}/donations`),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["issue", id] });
    queryClient.invalidateQueries({ queryKey: ["issues"] });
  };

  const upvoteM = useMutation({
    mutationFn: () => api.post(`/issues/${id}/upvote`),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      invalidateAll();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const statusM = useMutation({
    mutationFn: (status: string) => api.patch(`/issues/${id}/status`, { status }),
    onSuccess: () => {
      toast.show("Status updated.", "success");
      invalidateAll();
    },
    onError: (e: any) => toast.show(e.message, "error"),
  });

  const usefulM = useMutation({
    mutationFn: (sid: string) => api.post(`/suggestions/${sid}/useful`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suggestions", id] }),
    onError: (e: any) => toast.show(e.message, "error"),
  });

  if (issueQ.isLoading || !issueQ.data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <BackHeader onBack={() => router.back()} />
        <LoadingView />
      </View>
    );
  }

  const issue = issueQ.data;
  const Icon = categoryIcon(issue.category);
  const img = fileUrl(issue.image_url);
  const funding = donQ.data?.total ?? issue.funding_total ?? 0;
  const contributors = donQ.data?.contributors ?? issue.funding_contributors ?? 0;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {img ? (
            <Image source={{ uri: img }} style={styles.heroImg} contentFit="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Icon size={48} color={colors.muted} />
            </View>
          )}
          <LinearGradient colors={["rgba(17,17,17,0)", "rgba(17,17,17,0.85)"]} style={styles.scrim} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} testID="issue-back">
              <CaretLeft size={20} color={colors.onSurfaceInverse} />
            </Pressable>
          </View>
          <View style={styles.heroBottom}>
            <Text style={styles.heroTitle}>{issue.title}</Text>
            <View style={styles.heroBadges}>
              <Badge label={issue.severity} color={severityColor(issue.severity, colors)} />
              <Badge label={issue.status} color={statusColor(issue.status, colors)} />
              {issue.is_recurring ? <Badge label="Recurring" color={colors.brand} /> : null}
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Icon size={16} color={colors.onSurface} />
            <Text style={styles.category}>{issue.category}</Text>
          </View>
          <Text style={styles.description}>{issue.description}</Text>

          <View style={styles.locRow}>
            <MapPin size={14} color={colors.muted} weight="fill" />
            <Text style={styles.locText}>{issue.location_name}</Text>
          </View>
          <View style={styles.miniMap}>
            <LeafletMap
              markers={[
                {
                  id: issue.id,
                  lat: issue.latitude,
                  lng: issue.longitude,
                  title: issue.title,
                  category: issue.category,
                  severity: issue.severity,
                  status: issue.status,
                  location_name: issue.location_name,
                  created_at: issue.created_at,
                },
              ]}
              center={[issue.latitude, issue.longitude]}
              zoom={14}
            />
          </View>
          <Text style={styles.reportedAt}>
            Reported by {issue.reporter_name || "Citizen"} · {new Date(issue.created_at).toLocaleDateString()}
          </Text>

          <Divider />

          {/* System Analysis */}
          <SectionHeader title="System Analysis" />
          <View style={styles.analysisGrid}>
            <AnalysisRow label="Detected category" value={issue.ai_category} />
            <AnalysisRow label="Severity" value={issue.ai_severity} valueColor={severityColor(issue.ai_severity, colors)} />
            <AnalysisRow label="Summary" value={issue.ai_summary} />
            <AnalysisRow label="Suggested government action" value={issue.ai_suggested_solution} />
          </View>
          {isGov ? (
            <View style={styles.priorityBox}>
              <Text style={styles.priorityLabel}>Priority</Text>
              <Text style={[styles.priorityValue, { color: priorityColor(issue.priority_label, colors) }]}>
                {issue.priority_label}
              </Text>
              {issue.strong_community_interest ? (
                <Text style={styles.communityInterest}>Strong community interest</Text>
              ) : null}
            </View>
          ) : null}

          <Divider />

          {/* Community Support */}
          <SectionHeader title="Community Support" />
          <View style={styles.supportRow}>
            <Pressable
              testID="upvote-button"
              onPress={() => upvoteM.mutate()}
              style={[styles.upvoteBtn, issue.has_upvoted && styles.upvoteBtnActive]}
            >
              <ArrowFatUp
                size={18}
                color={issue.has_upvoted ? colors.onBrandPrimary : colors.onSurface}
                weight={issue.has_upvoted ? "fill" : "regular"}
              />
              <Text style={[styles.upvoteBtnText, issue.has_upvoted && styles.upvoteBtnTextActive]}>
                {issue.has_upvoted ? "Upvoted" : "Upvote"} · {issue.upvote_count}
              </Text>
            </Pressable>
          </View>
          <View style={styles.fundingCard}>
            <View>
              <Text style={styles.fundingLabel}>Community Funding</Text>
              <Text style={styles.fundingValue}>₹{funding.toLocaleString("en-IN")}</Text>
              <Text style={styles.fundingContrib}>{contributors} contributor{contributors === 1 ? "" : "s"}</Text>
            </View>
            {!isGov ? (
              <Pressable style={styles.donateBtn} onPress={() => setDonateOpen(true)} testID="open-donate">
                <HandHeart size={18} color={colors.onBrandPrimary} weight="fill" />
                <Text style={styles.donateBtnText}>Support</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.protoNote}>Prototype feature — payment processing is not enabled.</Text>

          <Divider />

          {/* Suggestions */}
          <SectionHeader
            title="Suggestions & Solutions"
            action={
              !isGov ? (
                <Pressable onPress={() => setSuggestOpen(true)} testID="open-suggestion">
                  <Text style={styles.addLink}>Add</Text>
                </Pressable>
              ) : undefined
            }
          />
          <Text style={styles.suggestPrompt}>How can this problem be solved?</Text>
          {(suggQ.data || []).length === 0 ? (
            <Text style={styles.noSugg}>No suggestions yet. Be the first to propose a solution.</Text>
          ) : (
            (suggQ.data || []).map((s) => (
              <View key={s.id} style={styles.suggCard} testID={`suggestion-${s.id}`}>
                <Text style={styles.suggTitle}>{s.title}</Text>
                <Text style={styles.suggDesc}>{s.description}</Text>
                <View style={styles.suggFooter}>
                  <Text style={styles.suggAuthor}>
                    {s.author_name} · {s.contributor_type} · {new Date(s.created_at).toLocaleDateString()}
                  </Text>
                  {isGov ? (
                    <Pressable
                      style={styles.usefulBtn}
                      onPress={() => usefulM.mutate(s.id)}
                      testID={`useful-${s.id}`}
                    >
                      <ThumbsUp size={13} color={colors.onSurface} />
                      <Text style={styles.usefulText}>Useful · {s.helpful_count}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.helpfulTag}>
                      <ThumbsUp size={13} color={colors.muted} />
                      <Text style={styles.helpfulText}>{s.helpful_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Government Action */}
          {isGov ? (
            <>
              <Divider />
              <SectionHeader title="Government Action" />
              <Text style={styles.suggPrompt}>Update the current status</Text>
              <ChipRow
                options={STATUSES.map((s) => ({ label: s, value: s }))}
                value={issue.status as any}
                onChange={(s) => statusM.mutate(s)}
                testIDPrefix="status"
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Donate modal */}
      <DonateModal
        visible={donateOpen}
        onClose={() => setDonateOpen(false)}
        issueTitle={issue.title}
        currentFunding={funding}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ["donations", id] });
          invalidateAll();
        }}
        issueId={id!}
      />

      {/* Suggestion modal */}
      <SuggestionModal
        visible={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        issueId={id!}
        onDone={() => queryClient.invalidateQueries({ queryKey: ["suggestions", id] })}
      />
    </View>
  );
}

function BackHeader({ onBack }: { onBack: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onBack} style={{ padding: spacing.lg }}>
      <CaretLeft size={22} color={colors.onSurface} />
    </Pressable>
  );
}

function AnalysisRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.aRow}>
      <Text style={styles.aLabel}>{label}</Text>
      <Text style={[styles.aValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function DonateModal({
  visible,
  onClose,
  issueTitle,
  currentFunding,
  issueId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  issueTitle: string;
  currentFunding: number;
  issueId: string;
  onDone: () => void;
}) {
  const styles = useStyles();
  const toast = useToast();
  const [amount, setAmount] = useState<number | null>(100);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);

  const value = amount ?? parseInt(custom || "0", 10);

  const donate = async () => {
    if (!value || value <= 0) return toast.show("Please enter a valid amount.", "error");
    setLoading(true);
    try {
      await api.post(`/issues/${issueId}/donations`, { amount: value });
      onDone();
      onClose();
      setCustom("");
      setAmount(100);
      toast.show("Thank you. Your contribution has been recorded for this demonstration.", "success");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>Support this issue</Text>
        <Text style={styles.modalSub} numberOfLines={1}>{issueTitle}</Text>
        <Text style={styles.modalMeta}>Current community funding: ₹{currentFunding.toLocaleString("en-IN")}</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              testID={`donate-preset-${p}`}
              onPress={() => {
                setAmount(p);
                setCustom("");
              }}
              style={[styles.preset, amount === p && styles.presetActive]}
            >
              <Text style={[styles.presetText, amount === p && styles.presetTextActive]}>₹{p}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          testID="donate-custom"
          value={custom}
          onChangeText={(t) => {
            setCustom(t.replace(/[^0-9]/g, ""));
            setAmount(null);
          }}
          keyboardType="number-pad"
          placeholder="Custom amount"
        />
        <View style={{ marginTop: spacing.lg }}>
          <Button label={`Donate ₹${value || 0}`} onPress={donate} loading={loading} testID="confirm-donate" />
        </View>
        <Text style={styles.protoNote}>Prototype feature — payment processing is not enabled.</Text>
      </View>
    </Modal>
  );
}

function SuggestionModal({
  visible,
  onClose,
  issueId,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  issueId: string;
  onDone: () => void;
}) {
  const styles = useStyles();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (title.trim().length < 3) return toast.show("Please add a title.", "error");
    if (desc.trim().length < 5) return toast.show("Please describe your suggestion.", "error");
    setLoading(true);
    try {
      await api.post(`/issues/${issueId}/suggestions`, { title: title.trim(), description: desc.trim() });
      onDone();
      onClose();
      setTitle("");
      setDesc("");
      toast.show("Suggestion added. Thank you!", "success");
    } catch (e: any) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>Add Your Suggestion</Text>
        <View style={{ marginTop: spacing.md }}>
          <Input testID="suggestion-title" value={title} onChangeText={setTitle} placeholder="Suggestion title" />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Input
            testID="suggestion-desc"
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe your proposed solution or approach"
            multiline
          />
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Button label="Submit Suggestion" onPress={submit} loading={loading} testID="confirm-suggestion" />
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 280, backgroundColor: colors.surfaceTertiary },
  heroImg: { width: "100%", height: "100%" },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 200 },
  heroTop: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: spacing.lg },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: "rgba(17,17,17,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.lg },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: spacing.sm },
  heroBadges: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  body: { padding: spacing.lg },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  category: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceTertiary },
  description: { fontSize: 15, color: colors.onSurface, lineHeight: 22 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.lg },
  locText: { fontSize: 13, color: colors.muted, flex: 1 },
  miniMap: {
    height: 160,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportedAt: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  analysisGrid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    gap: spacing.md,
  },
  aRow: {},
  aLabel: { fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  aValue: { fontSize: 14, color: colors.onSurface, marginTop: 2, lineHeight: 20 },
  priorityBox: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  priorityLabel: { fontSize: 12, color: colors.muted, fontWeight: "700" },
  priorityValue: { fontSize: 15, fontWeight: "800" },
  communityInterest: { fontSize: 12, color: colors.brand, fontWeight: "700", marginLeft: "auto" },
  supportRow: { flexDirection: "row", gap: spacing.md },
  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 46,
  },
  upvoteBtnActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  upvoteBtnText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  upvoteBtnTextActive: { color: colors.onBrandPrimary },
  fundingCard: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  fundingLabel: { fontSize: 12, color: colors.muted },
  fundingValue: { fontSize: 22, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  fundingContrib: { fontSize: 12, color: colors.muted, marginTop: 2 },
  donateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
  },
  donateBtnText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  protoNote: { fontSize: 11, color: colors.muted, marginTop: spacing.sm, fontStyle: "italic" },
  addLink: { fontSize: 14, fontWeight: "700", color: colors.brand },
  suggestPrompt: { fontSize: 14, color: colors.onSurface, marginBottom: spacing.md, marginTop: -6 },
  suggPrompt: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm, marginTop: -6 },
  noSugg: { fontSize: 13, color: colors.muted },
  suggCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  suggTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  suggDesc: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 4, lineHeight: 19 },
  suggFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  suggAuthor: { fontSize: 11, color: colors.muted, flex: 1 },
  usefulBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  usefulText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  helpfulTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  helpfulText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,17,17,0.4)" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  modalSub: { fontSize: 13, color: colors.onSurfaceTertiary, marginTop: 2 },
  modalMeta: { fontSize: 13, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.md },
  presetRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  preset: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  presetActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  presetText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  presetTextActive: { color: colors.onSurfaceInverse },
}));
