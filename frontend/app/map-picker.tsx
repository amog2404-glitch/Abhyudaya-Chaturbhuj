import { useRouter } from "expo-router";
import { X } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafletMap } from "@/src/components/LeafletMap";
import { Button } from "@/src/components/ui";
import { useGeo } from "@/src/context/geo";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { setPickedLocation } from "@/src/utils/pickedLocation";

export default function MapPicker() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coords } = useGeo();

  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    coords ? { lat: coords.latitude, lng: coords.longitude } : null,
  );

  const center: [number, number] = coords
    ? [coords.latitude, coords.longitude]
    : [22.9734, 78.6569];

  const onConfirm = () => {
    if (!picked) return;
    setPickedLocation({ latitude: picked.lat, longitude: picked.lng });
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="map-picker-close">
          <X size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Select Location</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.mapWrap}>
        <LeafletMap
          mode="pick"
          center={center}
          zoom={coords ? 13 : 5}
          pickInitial={picked ? [picked.lat, picked.lng] : null}
          onPick={(lat, lng) => setPicked({ lat, lng })}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.hint}>
          {picked ? `Selected: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : "Tap on the map to drop a pin."}
        </Text>
        <Button label="Confirm Location" onPress={onConfirm} disabled={!picked} testID="confirm-location" />
      </View>
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
  title: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  mapWrap: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  hint: { fontSize: 13, color: colors.muted, textAlign: "center" },
}));
