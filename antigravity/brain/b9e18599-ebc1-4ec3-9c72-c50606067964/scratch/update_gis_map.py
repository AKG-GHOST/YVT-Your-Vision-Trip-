import os
from pathlib import Path

WORKSPACE = Path(r"C:\Users\akhil\.gemini\antigravity\scratch")
FRONTEND = WORKSPACE / "frontend"
SRC = FRONTEND / "src"

# 1. Update index.html
html = (FRONTEND / "index.html").read_text(encoding="utf-8")

if "leaflet.js" not in html:
    leaflet_header = """  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <link rel="stylesheet" href="/src/styles.css" />"""
    html = html.replace('<link rel="stylesheet" href="/src/styles.css" />', leaflet_header)

map_snippet = """        <!-- Interactive GIS Route & Commuter Flow Map -->
        <div class="card-box mt-4">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h3>🗺️ NATPAC Interactive GIS Transit & Commuter Flow Map</h3>
              <p class="text-muted text-sm">Geographical visualization of logged survey routes, public transport corridors, and destination hubs across Kerala.</p>
            </div>
            <button id="btn-reset-map" class="btn-pill">🔍 Center Kerala</button>
          </div>
          <div id="gis-map-container" style="height: 380px; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: #111827;"></div>
        </div>
"""

if 'id="gis-map-container"' not in html and '<div class="card-box mt-4">' in html:
    html = html.replace('<div class="card-box mt-4">', map_snippet + '\n        <div class="card-box mt-4">', 1)

(FRONTEND / "index.html").write_text(html, encoding="utf-8")

# 2. Update main.js and main.ts to initialize Leaflet GIS map
gis_code = """
// Interactive Leaflet GIS Map for NATPAC Transport Planning
let gisMap = null;
let gisLayerGroup = null;

function initGISMap() {
  const container = document.getElementById("gis-map-container");
  if (!container || typeof L === "undefined") return;
  if (gisMap) {
    gisMap.invalidateSize();
    return;
  }

  // Center on Kerala coordinates (10.0, 76.5)
  gisMap = L.map("gis-map-container").setView([10.0889, 76.6], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors | NATPAC SIH 2025"
  }).addTo(gisMap);

  gisLayerGroup = L.layerGroup().addTo(gisMap);
  renderGISRoutes();

  const btnReset = document.getElementById("btn-reset-map");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      gisMap.setView([10.0889, 76.6], 7);
    });
  }
}

function renderGISRoutes() {
  if (!gisMap || !gisLayerGroup || typeof L === "undefined") return;
  gisLayerGroup.clearLayers();

  // 1. Destination Pins
  allDestinations.forEach((d) => {
    if (d.latitude && d.longitude) {
      const marker = L.circleMarker([d.latitude, d.longitude], {
        radius: 8,
        fillColor: "#10b981",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });
      marker.bindPopup(`
        <div style="font-family: sans-serif; color: #111827;">
          <h4 style="margin: 0 0 4px 0; color: #059669;">🌴 ${d.name}</h4>
          <p style="margin: 0; font-size: 12px;"><strong>Region:</strong> ${d.state_region}</p>
          <p style="margin: 0; font-size: 12px;"><strong>Weather:</strong> ${d.weather_summary}</p>
          <p style="margin: 0; font-size: 12px; color: #d97706;"><strong>Cost:</strong> ₹${d.approx_cost_per_day}/day</p>
        </div>
      `);
      gisLayerGroup.addLayer(marker);
    }
  });

  // 2. Sample Trip Lines across Kerala
  const routes = [
    { from: [8.5241, 76.9366], to: [8.8932, 76.6141], mode: "Bus", color: "#3b82f6", label: "Trivandrum ➔ Kollam (KSRTC)" },
    { from: [9.9312, 76.2673], to: [9.4981, 76.3388], mode: "Car", color: "#f59e0b", label: "Kochi ➔ Alappuzha (NH 66)" },
    { from: [10.1076, 76.3516], to: [10.0889, 77.0595], mode: "Bus", color: "#8b5cf6", label: "Aluva ➔ Munnar (Hill Route)" },
    { from: [8.5686, 76.8731], to: [8.5284, 76.9412], mode: "Metro/Bus", color: "#10b981", label: "Kazhakkoottam ➔ Pattom (NATPAC Commute)" }
  ];

  routes.forEach((r) => {
    const polyline = L.polyline([r.from, r.to], {
      color: r.color,
      weight: 4,
      opacity: 0.85,
      dashArray: "6, 8"
    });
    polyline.bindPopup(`<strong>${r.label}</strong><br/>Primary Mode: ${r.mode}`);
    gisLayerGroup.addLayer(polyline);
  });
}
"""

main_js = (SRC / "main.js").read_text(encoding="utf-8")
if "function initGISMap()" not in main_js:
    # Append GIS logic and call initGISMap in loadAnalytics and tab switch
    main_js = main_js.replace("function initAnalytics() {}", "function initAnalytics() {\n  initGISMap();\n}")
    main_js = main_js.replace("if (targetId === \"tab-analytics\") loadAnalytics();", "if (targetId === \"tab-analytics\") { loadAnalytics(); setTimeout(() => { if (gisMap) gisMap.invalidateSize(); else initGISMap(); }, 200); }")
    main_js += gis_code
    (SRC / "main.js").write_text(main_js, encoding="utf-8")

main_ts = (SRC / "main.ts").read_text(encoding="utf-8")
if "function initGISMap()" not in main_ts:
    main_ts = main_ts.replace("function initAnalytics() {}", "function initAnalytics() {\n  initGISMap();\n}")
    main_ts = main_ts.replace("if (targetId === \"tab-analytics\") loadAnalytics();", "if (targetId === \"tab-analytics\") { loadAnalytics(); setTimeout(() => { if (gisMap) (gisMap as any).invalidateSize(); else initGISMap(); }, 200); }")
    main_ts += gis_code
    (SRC / "main.ts").write_text(main_ts, encoding="utf-8")

print("Leaflet GIS Mapping added successfully!")
