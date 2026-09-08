import { WebView } from "react-native-webview";

import { buildMapHtml, type MapMarker } from "./leaflet-html";

export type LeafletMapProps = {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  mode?: "view" | "pick";
  pickInitial?: [number, number] | null;
  onMarkerPress?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  style?: any;
};

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
  const html = buildMapHtml({ markers, center, zoom, mode, pickInitial });
  return (
    <WebView
      testID="leaflet-map"
      originWhitelist={["*"]}
      source={{ html }}
      style={[{ flex: 1, backgroundColor: "#F7F7F7" }, style]}
      onMessage={(e) => {
        try {
          const data = JSON.parse(e.nativeEvent.data);
          if (data.type === "view" && data.id) onMarkerPress?.(data.id);
          if (data.type === "pick") onPick?.(data.lat, data.lng);
        } catch {
          // ignore
        }
      }}
    />
  );
}
