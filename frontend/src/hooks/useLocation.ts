import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";

export type Coords = { latitude: number; longitude: number; name?: string };

export function useLocation() {
  const [loading, setLoading] = useState(false);

  const getCurrent = useCallback(async (): Promise<
    { ok: true; coords: Coords } | { ok: false; reason: "denied" | "blocked" | "error"; message: string }
  > => {
    setLoading(true);
    try {
      let { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
        canAskAgain = req.canAskAgain;
      }
      if (status !== "granted") {
        return {
          ok: false,
          reason: canAskAgain ? "denied" : "blocked",
          message: canAskAgain
            ? "Location permission is needed to tag your report. Please allow it or select a spot on the map."
            : "Location permission is blocked. Enable it in Settings, or select a spot on the map.",
        };
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (geo && geo[0]) {
          const g = geo[0];
          coords.name = [g.name, g.district || g.subregion, g.city, g.region]
            .filter(Boolean)
            .slice(0, 3)
            .join(", ");
        }
      } catch {
        // reverse geocode optional
      }
      return { ok: true, coords };
    } catch (e: any) {
      return { ok: false, reason: "error", message: "Could not get your location. Try selecting on the map." };
    } finally {
      setLoading(false);
    }
  }, []);

  const openSettings = useCallback(() => {
    if (Platform.OS !== "web") Linking.openSettings();
  }, []);

  return { getCurrent, loading, openSettings };
}
