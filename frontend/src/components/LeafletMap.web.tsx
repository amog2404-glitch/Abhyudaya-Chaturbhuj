import { createElement, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

import { buildMapHtml } from "./leaflet-html";
import type { LeafletMapProps } from "./LeafletMap";

// On web (react-native-web => react-dom), we render a real <iframe> with srcDoc.
export function LeafletMap({
  markers,
  center,
  zoom,
  mode = "view",
  pickInitial,
  onMarkerPress,
  onPick,
  style,
}: LeafletMapProps) {
  const html = useMemo(
    () => buildMapHtml({ markers, center, zoom, mode, pickInitial }),
    [markers, center, zoom, mode, pickInitial],
  );
  const cbRef = useRef({ onMarkerPress, onPick });
  cbRef.current = { onMarkerPress, onPick };

  useEffect(() => {
    function handler(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data && data.type === "view" && data.id) cbRef.current.onMarkerPress?.(data.id);
        if (data && data.type === "pick") cbRef.current.onPick?.(data.lat, data.lng);
      } catch {
        // ignore
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <View style={[{ flex: 1, backgroundColor: "#F7F7F7", overflow: "hidden" }, style]} testID="leaflet-map">
      {createElement("iframe", {
        srcDoc: html,
        style: { width: "100%", height: "100%", border: "none" },
        title: "map",
      })}
    </View>
  );
}
