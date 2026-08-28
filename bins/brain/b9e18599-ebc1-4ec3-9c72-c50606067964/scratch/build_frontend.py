import os
from pathlib import Path

WORKSPACE = Path(r"C:\Users\akhil\.gemini\antigravity\scratch")
FRONTEND = WORKSPACE / "frontend"
SRC = FRONTEND / "src"

for d in [FRONTEND, SRC]:
    d.mkdir(parents=True, exist_ok=True)

# 1. Manifest
manifest_json = """{
  "name": "TripTrail | NATPAC Mobile Travel Survey",
  "short_name": "TripTrail",
  "description": "NATPAC Mobile Travel Survey & Real-World Tourism Explorer (SIH 2025)",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#090d16",
  "theme_color": "#10b981",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "https://cdn-icons-png.flaticon.com/512/854/854878.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "https://cdn-icons-png.flaticon.com/512/854/854878.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}"""
(FRONTEND / "manifest.webmanifest").write_text(manifest_json, encoding="utf-8")
(FRONTEND / "manifest.json").write_text(manifest_json, encoding="utf-8")

# 2. Service Worker
sw_js = """const CACHE_NAME = 'triptrail-v2';
const ASSETS = ['/', '/src/styles.css', '/src/main.ts', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
"""
(FRONTEND / "sw.js").write_text(sw_js, encoding="utf-8")

# 3. HTML
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0d131f" />
  <meta name="description" content="TripTrail & NATPAC Mobile Travel Survey Platform (SIH 2025 Problem 25082 - Govt of Kerala)" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/styles.css" />
  <title>TripTrail | NATPAC Mobile Travel Survey & Tourism Hub</title>
</head>
<body>
  <div id="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-container">
        <div class="brand-box">
          <div class="brand-icon">🌴</div>
          <div class="brand-text">
            <h1>TripTrail <span class="badge-sih">SIH 2025</span></h1>
            <p class="brand-subtitle">NATPAC Travel Survey • Govt of Kerala</p>
          </div>
        </div>
        <div class="header-actions">
          <div id="db-status-pill" class="status-pill status-connecting">
            <span class="status-dot"></span>
            <span class="status-label">Connecting DB...</span>
          </div>
          <button id="btn-open-sql" class="btn-icon" title="Open SQL Console">⚡ SQL</button>
        </div>
      </div>
      
      <!-- Tab Navigation -->
      <nav class="app-nav">
        <button class="nav-tab active" data-tab="tab-survey">
          <span class="tab-icon">📋</span>
          <span class="tab-label">Trip Logger</span>
        </button>
        <button class="nav-tab" data-tab="tab-trips">
          <span class="tab-icon">🗺️</span>
          <span class="tab-label">My Trips</span>
        </button>
        <button class="nav-tab" data-tab="tab-ai-route">
          <span class="tab-icon">🤖</span>
          <span class="tab-label">AI Route & Itinerary</span>
        </button>
        <button class="nav-tab" data-tab="tab-tourism">
          <span class="tab-icon">🍛</span>
          <span class="tab-label">Tourism Explorer</span>
        </button>
        <button class="nav-tab" data-tab="tab-analytics">
          <span class="tab-icon">📊</span>
          <span class="tab-label">NATPAC Analytics</span>
        </button>
      </nav>
    </header>

    <!-- Main Container -->
    <main class="app-main">
      <!-- 1. TAB: NATPAC TRAVEL SURVEY & TRIP LOGGER -->
      <section id="tab-survey" class="tab-pane active">
        <div class="pane-header">
          <div>
            <h2>NATPAC Mobile Travel Survey</h2>
            <p class="pane-desc">Capture your travel data (origin, time, mode, destination, fare) to support Kerala transportation planning.</p>
          </div>
          <div class="header-tools">
            <button id="btn-quick-gps" class="btn-pill btn-primary-glow">
              <span class="btn-icon-inner">📍</span> Auto-Detect GPS Location
            </button>
          </div>
        </div>

        <!-- AI Voice / Text Prompt Parser -->
        <div class="ai-prompt-card">
          <div class="ai-prompt-header">
            <div class="ai-badge">⚡ AI Fast Logger</div>
            <span>Type or paste your journey in plain words:</span>
          </div>
          <div class="ai-input-group">
            <input type="text" id="ai-trip-text-input" placeholder="e.g. Took KSRTC bus from Trivandrum to Kollam at 8:30 AM for office work, paid 65 rs" />
            <button id="btn-parse-trip-ai" class="btn-accent">Auto-Fill Form 🚀</button>
          </div>
        </div>

        <!-- Survey Form -->
        <form id="trip-survey-form" class="survey-card">
          <div class="form-row-2">
            <div class="form-group">
              <label for="trip-title">Trip Title / Journey Name *</label>
              <input type="text" id="trip-title" required placeholder="e.g. Daily Commute to NATPAC Office" />
            </div>
            <div class="form-group">
              <label for="trip-sequence">Trip Sequence Number</label>
              <input type="number" id="trip-sequence" min="1" value="1" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="trip-origin">Origin / Starting Place *</label>
              <div class="input-with-action">
                <input type="text" id="trip-origin" required placeholder="e.g. Kazhakkoottam, Thiruvananthapuram" />
                <button type="button" id="btn-gps-origin" class="input-btn" title="Use Current GPS">📍</button>
              </div>
            </div>
            <div class="form-group">
              <label for="trip-destination">Destination Place *</label>
              <input type="text" id="trip-destination" required placeholder="e.g. Pattom, Thiruvananthapuram" />
            </div>
          </div>

          <!-- Travel Mode Selector -->
          <div class="form-group">
            <label>Primary Mode of Transportation *</label>
            <div class="mode-grid">
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Bus" checked /><span>🚌 Bus (KSRTC/Pvt)</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Train" /><span>🚆 Train</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Metro" /><span>🚇 Kochi Metro</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Auto" /><span>🛺 Auto-rickshaw</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Car" /><span>🚗 Car / Cab</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Two-Wheeler" /><span>🛵 Bike / Scooter</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Walking" /><span>🚶 Walking</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Bicycle" /><span>🚲 Bicycle</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Ferry" /><span>⛴️ Ferry / Boat</span></label>
              <label class="mode-chip"><input type="radio" name="travel_mode" value="Flight" /><span>✈️ Flight</span></label>
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label for="trip-purpose">Trip Purpose *</label>
              <select id="trip-purpose">
                <option value="Work">💼 Work / Office</option>
                <option value="Education">🎓 Education / College / School</option>
                <option value="Tourism">🌴 Tourism / Sightseeing</option>
                <option value="Shopping">🛍️ Shopping / Market</option>
                <option value="Healthcare">🏥 Healthcare / Hospital</option>
                <option value="Social">🤝 Social / Family Visit</option>
                <option value="Return Home">🏡 Return Home</option>
              </select>
            </div>
            <div class="form-group">
              <label for="trip-dep-time">Departure Time</label>
              <input type="time" id="trip-dep-time" value="08:30" />
            </div>
            <div class="form-group">
              <label for="trip-arr-time">Arrival Time</label>
              <input type="time" id="trip-arr-time" value="09:15" />
            </div>
          </div>

          <div class="form-row-3">
            <div class="form-group">
              <label for="trip-start-date">Travel Start Date *</label>
              <input type="date" id="trip-start-date" required />
            </div>
            <div class="form-group">
              <label for="trip-end-date">Travel End Date *</label>
              <input type="date" id="trip-end-date" required />
            </div>
            <div class="form-group">
              <label for="trip-fare">Fare / Fuel Cost (₹)</label>
              <input type="number" id="trip-fare" min="0" step="0.5" value="25" />
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label for="trip-passengers">Accompanying Travelers</label>
              <input type="number" id="trip-passengers" min="1" max="50" value="1" />
            </div>
            <div class="form-group">
              <label for="trip-mood">Journey Mood</label>
              <select id="trip-mood">
                <option value="sunny">☀️ Sunny & Energized</option>
                <option value="happy">😊 Happy & Smooth</option>
                <option value="chill">🌊 Chill & Scenic</option>
                <option value="adventurous">⛰️ Adventurous</option>
                <option value="rainy">🌧️ Monsoon & Cozy</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="trip-note">Trip Notes / Experience / Observations</label>
            <textarea id="trip-note" rows="2" placeholder="e.g. Traffic on Bypass; clean KSRTC electric bus."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary btn-submit">
              <span>💾 Save Trip & Submit to NATPAC Survey</span>
            </button>
          </div>
        </form>
      </section>

      <!-- 2. TAB: MY TRIPS & JOURNAL -->
      <section id="tab-trips" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>My Trips & Travel Journal</h2>
            <p class="pane-desc">All recorded journeys stored securely in the Python SQLite database.</p>
          </div>
          <div class="header-tools">
            <input type="text" id="filter-trips-search" class="search-input" placeholder="Search trips by place/title..." />
            <button id="btn-refresh-trips" class="btn-pill">🔄 Refresh</button>
          </div>
        </div>

        <div id="trips-grid" class="trips-grid">
          <!-- Dynamically populated -->
        </div>
      </section>

      <!-- 3. TAB: AI ROUTE & SMART ITINERARY PLANNER -->
      <section id="tab-ai-route" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>AI Route & Itinerary Planner</h2>
            <p class="pane-desc">Preserved OpenAI / Gemini multi-stop routing + AI multi-day tourism itinerary generator.</p>
          </div>
        </div>

        <div class="grid-2-col">
          <!-- Route Planner -->
          <div class="card-box">
            <h3>🚗 Multi-Stop Driving Route AI</h3>
            <p class="text-muted">Enter multiple stops (e.g. "Thiruvananthapuram -> Alappuzha -> Kochi -> Munnar")</p>
            <div class="form-group">
              <input type="text" id="route-prompt-input" value="Thiruvananthapuram -> Alappuzha -> Kochi -> Munnar" />
            </div>
            <button id="btn-plan-route" class="btn-primary">Plan AI Route 🧭</button>

            <div id="route-result-box" class="result-box hidden">
              <div class="result-badge-row">
                <span id="route-mode-badge" class="badge-mode">Demo Mode</span>
                <span id="route-dist-badge" class="badge-metric">0 km</span>
                <span id="route-dur-badge" class="badge-metric">0 min</span>
              </div>
              <h4>Waypoints:</h4>
              <div id="route-stops-list" class="stops-chips"></div>
              <p id="route-note-msg" class="text-sm text-muted"></p>
              <a id="route-maps-link" href="#" target="_blank" class="btn-maps">🗺️ Open in Google Maps</a>
            </div>
          </div>

          <!-- Multi-Day Itinerary Planner -->
          <div class="card-box">
            <h3>🌴 AI Multi-Day Tourism Itinerary</h3>
            <p class="text-muted">Generate a custom day-by-day plan with dining, sightseeing, and transport.</p>
            <div class="form-row-2">
              <div class="form-group">
                <label>Destination</label>
                <select id="itinerary-dest-select">
                  <option value="Munnar">Munnar (Hill Station)</option>
                  <option value="Kochi">Kochi (Heritage & Port)</option>
                  <option value="Alappuzha">Alappuzha (Backwaters)</option>
                  <option value="Wayanad">Wayanad (Caves & Treks)</option>
                  <option value="Thiruvananthapuram">Thiruvananthapuram (Capital & Beaches)</option>
                  <option value="Goa">Goa (Coastal Paradise)</option>
                  <option value="Mysuru">Mysuru (Royal Palaces)</option>
                  <option value="Bengaluru">Bengaluru (Silicon City)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Days</label>
                <select id="itinerary-days-select">
                  <option value="2">2 Days (Weekend)</option>
                  <option value="3" selected>3 Days (Short Holiday)</option>
                  <option value="5">5 Days (Full Experience)</option>
                  <option value="7">7 Days (Grand Tour)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Budget Tier</label>
              <select id="itinerary-budget-select">
                <option value="budget">Backpacker / Budget (₹1,200 - ₹2,200/day)</option>
                <option value="moderate" selected>Moderate Comfort (₹2,800 - ₹4,500/day)</option>
                <option value="luxury">Luxury 5-Star (₹8,500 - ₹16,000/day)</option>
              </select>
            </div>
            <button id="btn-generate-itinerary" class="btn-accent">Generate AI Itinerary ✨</button>

            <div id="itinerary-result-box" class="result-box hidden">
              <h4 id="itinerary-title"></h4>
              <p id="itinerary-summary" class="text-sm"></p>
              <div class="itinerary-meta">
                <span id="itinerary-budget-badge" class="badge-metric"></span>
                <span id="itinerary-season-badge" class="badge-metric"></span>
              </div>
              <div id="itinerary-timeline" class="itinerary-timeline"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. TAB: TOURISM EXPLORER (LIVE APIS) -->
      <section id="tab-tourism" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>Real-World Tourism Explorer & Live APIs</h2>
            <p class="pane-desc">Discover Food 🍛, Attractions 🏛️, Hotels 🏨, Activities 🎯, and Live Weather 🌦️ powered by OpenStreetMap & Wikivoyage.</p>
          </div>
          <div class="header-tools">
            <div class="search-with-button">
              <input type="text" id="live-search-input" class="search-input" placeholder="Search any city (e.g. Varkala, Kozhikode, Ooty)..." />
              <button id="btn-fetch-live-dest" class="btn-pill btn-primary">Fetch Live 🌐</button>
            </div>
          </div>
        </div>

        <!-- Filter pills -->
        <div class="category-pills">
          <button class="cat-pill active" data-cat="all">All Destinations</button>
          <button class="cat-pill" data-cat="hill">Hill Stations & Tea</button>
          <button class="cat-pill" data-cat="coastal">Coastal & Beaches</button>
          <button class="cat-pill" data-cat="backwaters">Backwaters</button>
          <button class="cat-pill" data-cat="heritage">Heritage & Palaces</button>
          <button class="cat-pill" data-cat="kerala">Kerala Only</button>
        </div>

        <div id="destinations-grid" class="destinations-grid">
          <!-- Dynamically populated -->
        </div>
      </section>

      <!-- 5. TAB: NATPAC TRANSPORTATION PLANNING ANALYTICS -->
      <section id="tab-analytics" class="tab-pane">
        <div class="pane-header">
          <div>
            <h2>NATPAC Transportation Planning & GIS Analytics</h2>
            <p class="pane-desc">Data insights for transport planners, modal split analysis, peak travel hours, and SIH evaluation dataset.</p>
          </div>
          <div class="header-tools">
            <a href="/api/analytics/export/csv" download="natpac_travel_survey_data.csv" class="btn-pill btn-primary-glow">
              📥 Export Survey CSV
            </a>
          </div>
        </div>

        <!-- Key Metrics Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-icon">🚗</span>
            <div class="kpi-content">
              <span class="kpi-value" id="kpi-trips">0</span>
              <span class="kpi-label">Total Survey Trips</span>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">🛣️</span>
            <div class="kpi-content">
              <span class="kpi-value" id="kpi-dist">0 km</span>
              <span class="kpi-label">Total Distance</span>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">⏱️</span>
            <div class="kpi-content">
              <span class="kpi-value" id="kpi-dur">0 min</span>
              <span class="kpi-label">Avg Trip Duration</span>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">👥</span>
            <div class="kpi-content">
              <span class="kpi-value" id="kpi-passengers">0</span>
              <span class="kpi-label">Passenger Volume</span>
            </div>
          </div>
          <div class="kpi-card">
            <span class="kpi-icon">🌿</span>
            <div class="kpi-content">
              <span class="kpi-value" id="kpi-co2">0 kg</span>
              <span class="kpi-label">Estimated CO₂ Baseline</span>
            </div>
          </div>
        </div>

        <!-- Analytics Grid -->
        <div class="grid-2-col">
          <!-- Modal Split Breakdown -->
          <div class="card-box">
            <h3>📊 Modal Split (Travel Mode Share)</h3>
            <p class="text-muted text-sm">Distribution of passenger choices across public and private transit.</p>
            <div id="mode-split-bars" class="analytics-bars-container"></div>
          </div>

          <!-- Peak Travel Hours -->
          <div class="card-box">
            <h3>⏰ Peak Travel Hours (Departure Flow)</h3>
            <p class="text-muted text-sm">Hourly distribution of commuter departures (6 AM to 10 PM).</p>
            <div id="peak-hours-bars" class="peak-histogram-container"></div>
          </div>
        </div>

        <!-- OD Matrix Table -->
        <div class="card-box mt-4">
          <h3>📍 Origin - Destination (OD) Commuter Corridor Matrix</h3>
          <p class="text-muted text-sm">Top transit corridors and passenger travel flows captured across Kerala.</p>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Destination</th>
                  <th>Mode</th>
                  <th>Trip Flow Volume</th>
                  <th>Avg Duration</th>
                  <th>Avg Distance</th>
                </tr>
              </thead>
              <tbody id="od-matrix-body">
                <!-- Dynamically populated -->
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <!-- Modal for Destination Details -->
    <div id="dest-modal" class="modal-backdrop hidden">
      <div class="modal-container">
        <button id="btn-close-modal" class="modal-close">&times;</button>
        <div id="modal-content" class="modal-body"></div>
      </div>
    </div>

    <!-- Modal for SQL Console -->
    <div id="sql-modal" class="modal-backdrop hidden">
      <div class="modal-container">
        <button id="btn-close-sql" class="modal-close">&times;</button>
        <div class="modal-body">
          <h3>⚡ Python SQLite SQL Console</h3>
          <p class="text-muted text-sm">Execute live queries against the Python database engine (/api/query).</p>
          <textarea id="sql-input" rows="3">SELECT id, title, travel_mode, trip_purpose, fare_cost, start_date FROM trips ORDER BY id DESC LIMIT 5;</textarea>
          <div class="form-actions mt-2">
            <button id="btn-execute-sql" class="btn-primary">Execute Query ▶</button>
          </div>
          <div id="sql-results-table" class="table-responsive mt-3"></div>
        </div>
      </div>
    </div>
  </div>

  <script type="module" src="/src/main.ts"></script>
</body>
</html>"""
(FRONTEND / "index.html").write_text(html_content, encoding="utf-8")

# 4. CSS
css_content = """/* TripTrail NATPAC Theme (SIH 2025) */
:root {
  --bg-dark: #090d16;
  --bg-card: #111827;
  --bg-card-glass: rgba(17, 24, 39, 0.78);
  --bg-hover: #1f293d;
  --primary: #10b981;
  --primary-glow: rgba(16, 185, 129, 0.35);
  --primary-dark: #059669;
  --accent: #3b82f6;
  --accent-glow: rgba(59, 130, 246, 0.3);
  --amber: #f59e0b;
  --purple: #8b5cf6;
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --border-color: rgba(255, 255, 255, 0.08);
  --border-focus: #10b981;
  --radius-lg: 16px;
  --radius-md: 10px;
  --radius-sm: 6px;
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  --font-display: 'Outfit', sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: var(--font-sans);
  min-height: 100vh;
  line-height: 1.5;
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%);
  background-attachment: fixed;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 80px;
}

/* Header */
.app-header {
  background: var(--bg-card-glass);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px 24px;
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.brand-box {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  font-size: 32px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid var(--primary-glow);
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}

.brand-text h1 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-sih {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  color: #fff;
  text-transform: uppercase;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.25);
}

.status-connecting { color: var(--amber); }
.status-connected { color: #34d399; }
.status-error { color: #f87171; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 6px 14px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* Nav Tabs */
.app-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.nav-tab {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-tab:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
}

.nav-tab.active {
  color: #fff;
  background: var(--primary-dark);
  box-shadow: 0 4px 14px var(--primary-glow);
}

/* Pane Header */
.tab-pane {
  display: none;
  animation: fadeIn 0.3s ease;
}

.tab-pane.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.pane-header h2 {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
}

.pane-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Buttons */
.btn-primary, .btn-accent, .btn-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 10px 20px;
  text-decoration: none;
}

.btn-primary {
  background: var(--primary);
  color: #0d131f;
}

.btn-primary:hover {
  background: #34d399;
  box-shadow: 0 4px 16px var(--primary-glow);
}

.btn-primary-glow {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 20px var(--primary-glow);
}

.btn-accent {
  background: var(--accent);
  color: #fff;
}

.btn-accent:hover {
  background: #60a5fa;
  box-shadow: 0 4px 16px var(--accent-glow);
}

.btn-pill {
  border-radius: 30px;
  font-size: 13px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border: 1px solid var(--border-color);
}

.btn-pill:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Cards & Forms */
.card-box, .survey-card, .ai-prompt-card {
  background: var(--bg-card-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.ai-prompt-card {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(16, 185, 129, 0.08));
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.ai-prompt-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.ai-badge {
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
}

.ai-input-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.ai-input-group input {
  flex: 1;
  min-width: 260px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  color: #fff;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
}

.ai-input-group input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

/* Form Layouts */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.form-group input, .form-group select, .form-group textarea {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-glow);
}

.input-with-action {
  display: flex;
  gap: 8px;
}

.input-with-action input {
  flex: 1;
}

.input-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0 14px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.input-btn:hover {
  background: var(--primary);
}

/* Mode Chip Grid */
.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}

.mode-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.mode-chip input {
  display: none;
}

.mode-chip:has(input:checked) {
  background: rgba(16, 185, 129, 0.18);
  border-color: var(--primary);
  color: #34d399;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  font-size: 15px;
}

/* Grids & Columns */
.grid-2-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Trips Grid */
.trips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
}

.trip-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s, box-shadow 0.2s;
}

.trip-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.16);
}

.trip-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.trip-card-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.trip-mode-tag {
  background: rgba(59, 130, 246, 0.18);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}

.trip-route-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.trip-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
}

.meta-badge {
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 4px;
  color: #d1d5db;
}

.trip-note-text {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  margin-bottom: 16px;
}

.trip-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
}

.btn-delete-trip {
  background: transparent;
  border: none;
  color: #f87171;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-delete-trip:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Tourism Grid */
.category-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 4px;
}

.cat-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.cat-pill.active {
  background: var(--primary);
  color: #090d16;
  border-color: var(--primary);
}

.destinations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.dest-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.dest-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  border-color: rgba(16, 185, 129, 0.4);
}

.dest-img-box {
  height: 180px;
  position: relative;
  background: #1f293d;
}

.dest-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dest-rating-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: #fbbf24;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

.dest-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.dest-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.dest-region {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.dest-desc {
  font-size: 13px;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dest-features {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #d1d5db;
  background: rgba(0, 0, 0, 0.25);
  padding: 10px;
  border-radius: var(--radius-md);
}

.dest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  font-size: 13px;
}

.dest-price {
  font-weight: 700;
  color: #34d399;
}

/* Analytics KPIs & Charts */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--bg-card-glass);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.kpi-icon {
  font-size: 28px;
  background: rgba(255, 255, 255, 0.05);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.kpi-value {
  display: block;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.kpi-label {
  font-size: 12px;
  color: var(--text-muted);
}

.analytics-bars-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}

.bar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  height: 10px;
  overflow: hidden;
}

.bar-fill {
  background: linear-gradient(90deg, #10b981, #3b82f6);
  height: 100%;
  border-radius: 10px;
  transition: width 0.6s ease;
}

.peak-histogram-container {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 160px;
  padding-top: 20px;
}

.histo-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 6px;
}

.histo-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.5s ease;
}

.histo-label {
  font-size: 10px;
  color: var(--text-muted);
}

/* Tables */
.table-responsive {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  font-weight: 600;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-backdrop.hidden {
  display: none;
}

.modal-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  max-width: 680px;
  width: 100%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 18px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
}

.modal-close:hover {
  color: #fff;
}

/* Result Box */
.result-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-top: 16px;
}

.result-box.hidden {
  display: none;
}

.result-badge-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.badge-mode {
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.badge-metric {
  background: rgba(255, 255, 255, 0.08);
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #34d399;
}

.stops-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}

.stop-chip {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid var(--primary-glow);
  color: #34d399;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
}

.btn-maps {
  display: inline-block;
  background: #ea4335;
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  margin-top: 10px;
}

.search-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  color: #fff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  min-width: 220px;
}

.search-with-button {
  display: flex;
  gap: 8px;
}

.text-muted { color: var(--text-muted); }
.text-sm { font-size: 12px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }

/* Responsive */
@media (max-width: 768px) {
  .form-row-2, .form-row-3, .grid-2-col {
    grid-template-columns: 1fr;
  }
  .header-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
}
"""
(SRC / "styles.css").write_text(css_content, encoding="utf-8")

# 5. TypeScript main.ts
(SRC / "main.ts").write_text("\n".join(ts_lines), encoding="utf-8")

print("Frontend files generated successfully!")
