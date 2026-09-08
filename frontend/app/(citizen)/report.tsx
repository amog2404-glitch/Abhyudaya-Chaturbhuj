import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Camera, ImageSquare, MapPin, NavigationArrow } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, uploadImage } from "@/src/api/client";
import { useToast } from "@/src/components/toast";
import { Button, ChipRow, Field, Input } from "@/src/components/ui";
import { CATEGORIES, severityColor, shortCategory } from "@/src/constants/civic";
import { useGeo } from "@/src/context/geo";
import { useLocation } from "@/src/hooks/useLocation";
import { queryClient } from "@/src/query-client";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { subscribePickedLocation } from "@/src/utils/pickedLocation";

const SEVERITY_OPTIONS = [
  { label: "Auto-assess", value: "auto" },
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
  { label: "Critical", value: "Critical" },
];

const CAT_OPTIONS = CATEGORIES.map((c) => ({ label: shortCategory(c), value: c }));

export default function Report() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { setManual } = useGeo();
  const { getCurrent, loading: locLoading } = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [severity, setSeverity] = useState<string>("auto");
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return subscribePickedLocation((v) => {
      setCoords({ latitude: v.latitude, longitude: v.longitude });
      if (v.name) setLocationName(v.name);
      setManual(v);
    });
  }, [setManual]);

  // Live system analysis preview (debounced)
  const debounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [analyzeKey, setAnalyzeKey] = useState("");
  useEffect(() => {
    if (debounced.current) clearTimeout(debounced.current);
    if (description.trim().length >= 12) {
      debounced.current = setTimeout(() => {
        setAnalyzeKey(`${description}|${category}|${!!imagePath}`);
      }, 500);
    } else {
      setAnalyzeKey("");
    }
    return () => {
      if (debounced.current) clearTimeout(debounced.current);
    };
  }, [description, category, imagePath]);

  const { data: analysis } = useQuery({
    queryKey: ["analyze", analyzeKey],
    enabled: analyzeKey.length > 0,
    queryFn: () =>
      api.post("/analyze", {
        description,
        category,
        has_image: !!imagePath,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }),
  });

  const pickImage = useCallback(
    async (fromCamera: boolean) => {
      try {
        if (fromCamera) {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            toast.show("Camera permission is needed to take a photo.", "error");
            return;
          }
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            toast.show("Photo library permission is needed to choose an image.", "error");
            return;
          }
        }
        const result = fromCamera
          ? await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        setLocalImage(asset.uri);
        setUploading(true);
        try {
          const up = await uploadImage(asset.uri, asset.fileName || "photo.jpg", asset.mimeType || "image/jpeg");
          setImagePath(up.path);
        } catch (e: any) {
          toast.show(e.message || "Image upload failed.", "error");
          setLocalImage(null);
        } finally {
          setUploading(false);
        }
      } catch {
        toast.show("Could not open image picker.", "error");
      }
    },
    [toast],
  );

  const useCurrentLocation = useCallback(async () => {
    const res = await getCurrent();
    if (res.ok) {
      setCoords(res.coords);
      if (res.coords.name) setLocationName(res.coords.name);
      setManual(res.coords);
      Haptics.selectionAsync().catch(() => {});
    } else {
      toast.show(res.message, "error");
    }
  }, [getCurrent, setManual, toast]);

  const onSubmit = useCallback(async () => {
    if (title.trim().length < 3) return toast.show("Please add a short title.", "error");
    if (description.trim().length < 5) return toast.show("Please describe the issue.", "error");
    if (!coords) return toast.show("Please add a location for the issue.", "error");
    setSubmitting(true);
    try {
      const created = await api.post("/issues", {
        title: title.trim(),
        description: description.trim(),
        category,
        severity,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_name: locationName.trim() || undefined,
        image_url: imagePath ? `/api/files/${imagePath}` : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.show("Issue reported successfully.", "success");
      // reset
      setTitle("");
      setDescription("");
      setSeverity("auto");
      setLocalImage(null);
      setImagePath(null);
      router.push(`/issue/${created.id}`);
    } catch (e: any) {
      toast.show(e.message || "Could not submit the issue.", "error");
    } finally {
      setSubmitting(false);
    }
  }, [title, description, category, severity, coords, locationName, imagePath, router, toast]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Report an Issue</Text>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Title">
            <Input testID="report-title" value={title} onChangeText={setTitle} placeholder="e.g. Large pothole near college gate" />
          </Field>

          <Field label="Issue description">
            <Input
              testID="report-description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you see and why it needs attention."
              multiline
            />
          </Field>

          <Text style={styles.label}>Category</Text>
          <ChipRow options={CAT_OPTIONS as any} value={category as any} onChange={(v) => setCategory(v)} testIDPrefix="report-cat" />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Severity</Text>
          <ChipRow options={SEVERITY_OPTIONS as any} value={severity as any} onChange={(v) => setSeverity(v)} testIDPrefix="report-sev" />

          {/* Image */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>Photo</Text>
          {localImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: localImage }} style={styles.previewImg} contentFit="cover" />
              {uploading ? (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={colors.onSurfaceInverse} />
                </View>
              ) : null}
              <Pressable style={styles.changeImg} onPress={() => pickImage(false)} testID="change-image">
                <Text style={styles.changeImgText}>Change</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <Pressable style={styles.uploadZone} onPress={() => pickImage(false)} testID="upload-image">
                <ImageSquare size={22} color={colors.onSurface} />
                <Text style={styles.uploadText}>Upload Image</Text>
              </Pressable>
              <Pressable style={styles.uploadZone} onPress={() => pickImage(true)} testID="capture-image">
                <Camera size={22} color={colors.onSurface} />
                <Text style={styles.uploadText}>Take Photo</Text>
              </Pressable>
            </View>
          )}

          {/* Location */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>Location</Text>
          <View style={styles.locButtons}>
            <Pressable style={styles.locBtn} onPress={useCurrentLocation} testID="use-current-location">
              {locLoading ? (
                <ActivityIndicator color={colors.onSurface} />
              ) : (
                <>
                  <NavigationArrow size={18} color={colors.onSurface} weight="fill" />
                  <Text style={styles.locBtnText}>Use My Current Location</Text>
                </>
              )}
            </Pressable>
            <Pressable style={styles.locBtn} onPress={() => router.push("/map-picker")} testID="select-on-map">
              <MapPin size={18} color={colors.onSurface} weight="fill" />
              <Text style={styles.locBtnText}>Select on Map</Text>
            </Pressable>
          </View>
          {coords ? (
            <View style={styles.locResult} testID="location-result">
              <Text style={styles.locCoords}>
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
              <Input
                testID="location-name"
                value={locationName}
                onChangeText={setLocationName}
                placeholder="Location name (optional)"
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <Text style={styles.locHint}>Add a location so authorities can find the issue.</Text>
          )}

          {/* System analysis preview */}
          {analysis ? (
            <View style={styles.analysis} testID="analysis-preview">
              <Text style={styles.analysisTitle}>System Analysis</Text>
              <Row label="Detected category" value={analysis.ai_category} />
              <Row
                label="Severity"
                value={analysis.ai_severity}
                valueColor={severityColor(analysis.ai_severity, colors)}
              />
              <Row label="Summary" value={analysis.ai_summary} />
              <Row label="Suggested action" value={analysis.ai_suggested_solution} />
              <Text style={styles.confidence}>Confidence {Math.round(analysis.ai_confidence * 100)}%</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Analyze & Submit" onPress={onSubmit} loading={submitting} testID="submit-issue" />
      </View>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.aRow}>
      <Text style={styles.aLabel}>{label}</Text>
      <Text style={[styles.aValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  label: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.sm },
  uploadRow: { flexDirection: "row", gap: spacing.md },
  uploadZone: {
    flex: 1,
    height: 96,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
  },
  uploadText: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  imagePreview: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  previewImg: { width: "100%", height: 200 },
  uploadOverlay: {
    ...(Platform.OS === "web" ? {} : {}),
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17,17,17,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  changeImg: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  changeImgText: { color: colors.onSurfaceInverse, fontSize: 12, fontWeight: "700" },
  locButtons: { flexDirection: "row", gap: spacing.md },
  locBtn: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  locBtnText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  locResult: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  locCoords: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  locHint: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  analysis: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  analysisTitle: { fontSize: 14, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  aRow: { marginBottom: spacing.sm },
  aLabel: { fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  aValue: { fontSize: 14, color: colors.onSurface, marginTop: 2, lineHeight: 19 },
  confidence: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
}));
