// Builds a self-contained Leaflet + OpenStreetMap (grayscale CartoDB) HTML doc.
// Used by LeafletMap (native WebView) and LeafletMap.web (iframe).

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  severity: string;
  status: string;
  location_name?: string;
  created_at?: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  Low: "#059669",
  Medium: "#D97706",
  High: "#E50000",
  Critical: "#111111",
};

export function buildMapHtml(opts: {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  mode?: "view" | "pick";
  pickInitial?: [number, number] | null;
}): string {
  const { markers = [], center = [22.9734, 78.6569], zoom = 5, mode = "view", pickInitial = null } = opts;
  const markersJson = JSON.stringify(markers).replace(/</g, "\\u003c");
  const centerJson = JSON.stringify(center);
  const pickJson = JSON.stringify(pickInitial);
  const colorJson = JSON.stringify(SEVERITY_COLOR);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#F7F7F7;}
  .leaflet-popup-content-wrapper{border-radius:8px;box-shadow:none;border:1px solid #111;}
  .leaflet-popup-content{margin:12px 14px;font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;}
  .p-title{font-size:14px;font-weight:700;color:#111;margin-bottom:4px;}
  .p-meta{font-size:12px;color:#404040;margin:1px 0;}
  .p-sev{display:inline-block;padding:1px 6px;border-radius:4px;color:#fff;font-size:11px;font-weight:700;margin-top:4px;}
  .p-btn{display:block;margin-top:8px;background:#111;color:#fff;text-align:center;padding:7px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;}
  .pin{width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #111;}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var COLORS = ${colorJson};
  var MARKERS = ${markersJson};
  var MODE = "${mode}";
  var PICK = ${pickJson};

  function send(obj){
    var s = JSON.stringify(obj);
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(s); }
    else if (window.parent) { window.parent.postMessage(s, "*"); }
  }

  var map = L.map('map', { zoomControl: true, attributionControl: false }).setView(${centerJson}, ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  function pin(color){
    return L.divIcon({ className:'', html:'<div class="pin" style="background:'+color+'"></div>', iconSize:[16,16], iconAnchor:[8,8] });
  }

  if (MODE === 'view') {
    MARKERS.forEach(function(m){
      var color = COLORS[m.severity] || '#111';
      var marker = L.marker([m.lat, m.lng], { icon: pin(color) }).addTo(map);
      var date = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
      var html = '<div class="p-title">'+ (m.title||'') +'</div>'+
        '<div class="p-meta">'+ (m.category||'') +'</div>'+
        '<div class="p-meta">'+ (m.location_name||'') +'</div>'+
        '<div class="p-meta">Status: '+ (m.status||'') +'</div>'+
        (date ? '<div class="p-meta">Reported: '+ date +'</div>' : '')+
        '<span class="p-sev" style="background:'+color+'">'+ (m.severity||'') +'</span>'+
        '<a class="p-btn" href="#" onclick="send({type:\\'view\\',id:\\''+m.id+'\\'});return false;">View Issue</a>';
      marker.bindPopup(html);
    });
    if (MARKERS.length > 1) {
      try { map.fitBounds(L.latLngBounds(MARKERS.map(function(m){return [m.lat,m.lng];})).pad(0.2)); } catch(e){}
    } else if (MARKERS.length === 1) {
      map.setView([MARKERS[0].lat, MARKERS[0].lng], 14);
    }
  }

  if (MODE === 'pick') {
    var picked = null;
    function setPick(lat, lng){
      if (picked) { map.removeLayer(picked); }
      picked = L.marker([lat, lng], { icon: pin('#E50000') }).addTo(map);
      send({ type:'pick', lat: lat, lng: lng });
    }
    if (PICK) { map.setView(PICK, 14); setPick(PICK[0], PICK[1]); }
    map.on('click', function(e){ setPick(e.latlng.lat, e.latlng.lng); });
  }

  send({ type:'ready' });
</script>
</body>
</html>`;
}
