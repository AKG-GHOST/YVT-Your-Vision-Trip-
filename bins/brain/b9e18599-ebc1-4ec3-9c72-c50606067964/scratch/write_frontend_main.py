import os
from pathlib import Path

WORKSPACE = Path(r"C:\Users\akhil\.gemini\antigravity\scratch")
SRC = WORKSPACE / "frontend" / "src"
SRC.mkdir(parents=True, exist_ok=True)

main_ts = """// TripTrail & NATPAC Mobile Travel Survey App (SIH 2025)

interface Trip {
  id: number;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  note?: string;
  mood?: string;
  trip_number?: number;
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  travel_mode?: string;
  trip_purpose?: string;
  passenger_count?: number;
  fare_cost?: number;
  distance_km?: number;
  duration_min?: number;
  is_auto_detected?: number;
  created_at?: string;
}

interface Destination {
  id: number;
  name: string;
  state_region: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  food_cuisine: string[];
  attractions: string[];
  hotels: any[];
  activities: string[];
  ratings: number;
  approx_cost_per_day: number;
  best_season: string;
  weather_summary: string;
  image_url: string;
  source: string;
  weather_live?: any;
}

let allTrips: Trip[] = [];
let allDestinations: Destination[] = [];
let currentCategoryFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initStatusChecker();
  initSurveyForm();
  initGPSAutoDetect();
  initAIPromptParser();
  initAIRoutePlanner();
  initAIItinerary();
  initTourismExplorer();
  initAnalytics();
  initSQLConsole();
  loadTrips();
  loadDestinations();
  loadAnalytics();
  setDefaultDates();
});

function setDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  const startInput = document.getElementById("trip-start-date") as HTMLInputElement;
  const endInput = document.getElementById("trip-end-date") as HTMLInputElement;
  if (startInput && !startInput.value) startInput.value = today;
  if (endInput && !endInput.value) endInput.value = today;
}

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tab-pane").forEach((pane) => {
        pane.classList.remove("active");
      });
      const targetPane = document.getElementById(targetId || "");
      if (targetPane) targetPane.classList.add("active");
      if (targetId === "tab-trips") loadTrips();
      if (targetId === "tab-analytics") loadAnalytics();
      if (targetId === "tab-tourism") loadDestinations();
    });
  });
}

// Status Checker
async function initStatusChecker() {
  const pill = document.getElementById("db-status-pill");
  if (!pill) return;
  try {
    const res = await fetch("/api/status");
    if (res.ok) {
      const data = await res.json();
      pill.className = "status-pill status-connected";
      pill.innerHTML = `<span class="status-dot"></span><span class="status-label">🟢 Python SQLite (Trips: ${data.trips_count})</span>`;
    } else {
      pill.className = "status-pill status-error";
      pill.innerHTML = `<span class="status-dot"></span><span class="status-label">Offline</span>`;
    }
  } catch {
    pill.className = "status-pill status-error";
    pill.innerHTML = `<span class="status-dot"></span><span class="status-label">Connecting Demo</span>`;
  }
}

// GPS Auto Detect Location
function initGPSAutoDetect() {
  const btnQuick = document.getElementById("btn-quick-gps");
  const btnOrigin = document.getElementById("btn-gps-origin");
  const handler = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">⏳</span> Sensing Location...`;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch("/api/geocode/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await res.json();
          const originInput = document.getElementById("trip-origin") as HTMLInputElement;
          const titleInput = document.getElementById("trip-title") as HTMLInputElement;
          const placeName = data.locality ? `${data.locality}, ${data.district}` : data.display_name;
          if (originInput) originInput.value = placeName;
          if (titleInput && !titleInput.value) {
            titleInput.value = `Journey from ${data.locality || "Current Location"}`;
          }
          if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> GPS: ${data.locality || "Auto-Detected"}`;
        } catch {
          const originInput = document.getElementById("trip-origin") as HTMLInputElement;
          if (originInput) originInput.value = `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`;
          if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> GPS Acquired`;
        }
      },
      (err) => {
        if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> Auto-Detect GPS Location`;
        const originInput = document.getElementById("trip-origin") as HTMLInputElement;
        if (originInput && !originInput.value) originInput.value = "Thiruvananthapuram, Kerala";
        alert(`GPS Notice: Using default location (Permission ${err.message})`);
      },
      { timeout: 8000 }
    );
  };
  if (btnQuick) btnQuick.addEventListener("click", handler);
  if (btnOrigin) btnOrigin.addEventListener("click", handler);
}

// AI Voice / Text Fast Trip Logger
function initAIPromptParser() {
  const btn = document.getElementById("btn-parse-trip-ai");
  const input = document.getElementById("ai-trip-text-input") as HTMLInputElement;
  if (!btn || !input) return;
  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) {
      alert("Please enter a journey description first.");
      return;
    }
    btn.textContent = "Extracting... ⚡";
    try {
      const res = await fetch("/api/ai/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        (document.getElementById("trip-title") as HTMLInputElement).value = data.title;
        (document.getElementById("trip-origin") as HTMLInputElement).value = data.origin;
        (document.getElementById("trip-destination") as HTMLInputElement).value = data.destination;
        (document.getElementById("trip-purpose") as HTMLSelectElement).value = data.trip_purpose;
        (document.getElementById("trip-dep-time") as HTMLInputElement).value = data.departure_time;
        (document.getElementById("trip-arr-time") as HTMLInputElement).value = data.arrival_time;
        (document.getElementById("trip-fare") as HTMLInputElement).value = String(data.fare_cost);
        (document.getElementById("trip-note") as HTMLTextAreaElement).value = data.note;
        const modeRadios = document.querySelectorAll("input[name='travel_mode']") as NodeListOf<HTMLInputElement>;
        modeRadios.forEach((r) => {
          if (r.value.toLowerCase() === data.travel_mode.toLowerCase()) r.checked = true;
        });
        alert(`✨ AI Auto-Filled Form:\\n• Mode: ${data.travel_mode}\\n• Origin: ${data.origin}\\n• Destination: ${data.destination}\\n• Purpose: ${data.trip_purpose}\\n• Fare: ₹${data.fare_cost}`);
      }
    } catch (e: any) {
      alert(`AI parsing fallback: ${e.message}`);
    } finally {
      btn.textContent = "Auto-Fill Form 🚀";
    }
  });
}

// Survey Form Submission
function initSurveyForm() {
  const form = document.getElementById("trip-survey-form") as HTMLFormElement;
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedMode = (document.querySelector("input[name='travel_mode']:checked") as HTMLInputElement)?.value || "Bus";
    const title = (document.getElementById("trip-title") as HTMLInputElement).value.trim();
    const origin = (document.getElementById("trip-origin") as HTMLInputElement).value.trim();
    const destination = (document.getElementById("trip-destination") as HTMLInputElement).value.trim();
    const location = `${origin} to ${destination}`;
    const startDate = (document.getElementById("trip-start-date") as HTMLInputElement).value;
    const endDate = (document.getElementById("trip-end-date") as HTMLInputElement).value;
    const depTime = (document.getElementById("trip-dep-time") as HTMLInputElement).value;
    const arrTime = (document.getElementById("trip-arr-time") as HTMLInputElement).value;
    const purpose = (document.getElementById("trip-purpose") as HTMLSelectElement).value;
    const fare = parseFloat((document.getElementById("trip-fare") as HTMLInputElement).value) || 0.0;
    const passengers = parseInt((document.getElementById("trip-passengers") as HTMLInputElement).value) || 1;
    const seq = parseInt((document.getElementById("trip-sequence") as HTMLInputElement).value) || 1;
    const mood = (document.getElementById("trip-mood") as HTMLSelectElement).value;
    const note = (document.getElementById("trip-note") as HTMLTextAreaElement).value.trim();

    const payload = {
      title,
      location,
      start_date: startDate,
      end_date: endDate,
      origin,
      destination,
      departure_time: depTime,
      arrival_time: arrTime,
      travel_mode: selectedMode,
      trip_purpose: purpose,
      passenger_count: passengers,
      fare_cost: fare,
      trip_number: seq,
      mood,
      note,
      distance_km: 24.5,
      duration_min: 45,
      is_auto_detected: 1,
      is_synced: 1
    };

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("✅ Trip survey saved successfully to Python Database!");
        (document.getElementById("trip-title") as HTMLInputElement).value = "";
        (document.getElementById("trip-destination") as HTMLInputElement).value = "";
        (document.getElementById("trip-note") as HTMLTextAreaElement).value = "";
        (document.getElementById("trip-sequence") as HTMLInputElement).value = String(seq + 1);
        initStatusChecker();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || err.detail}`);
      }
    } catch (e: any) {
      alert(`Submission error: ${e.message}`);
    }
  });
}

// Load Trips List
async function loadTrips() {
  const grid = document.getElementById("trips-grid");
  if (!grid) return;
  grid.innerHTML = "<p class='text-muted'>Loading journeys from Python database...</p>";
  try {
    const res = await fetch("/api/trips");
    if (res.ok) {
      allTrips = await res.json();
      renderTrips(allTrips);
    }
  } catch (e: any) {
    grid.innerHTML = `<p class='text-muted'>Failed to load trips: ${e.message}</p>`;
  }
}

function renderTrips(trips: Trip[]) {
  const grid = document.getElementById("trips-grid");
  if (!grid) return;
  if (trips.length === 0) {
    grid.innerHTML = "<div class='card-box'><p class='text-muted'>No trip records found. Log your first trip using the Trip Logger tab!</p></div>";
    return;
  }
  grid.innerHTML = trips.map((t) => {
    const moodEmoji: Record<string, string> = { sunny: "☀️", happy: "😊", chill: "🌊", adventurous: "⛰️", rainy: "🌧️" };
    const emoji = moodEmoji[t.mood || "sunny"] || "☀️";
    const mode = t.travel_mode || "Bus";
    const dist = t.distance_km ? `${t.distance_km} km` : "Local";
    const dur = t.duration_min ? `${t.duration_min} min` : "30 min";
    return `
      <div class="trip-card">
        <div>
          <div class="trip-card-header">
            <h3 class="trip-card-title">${t.title}</h3>
            <span class="trip-mode-tag">${mode}</span>
          </div>
          <div class="trip-route-line">
            <span>📍</span>
            <span>${t.origin || t.location} ${t.destination ? "→ " + t.destination : ""}</span>
          </div>
          <div class="trip-meta-row">
            <span class="meta-badge">📅 ${t.start_date}</span>
            ${t.departure_time ? `<span class="meta-badge">⏰ ${t.departure_time} - ${t.arrival_time || ""}</span>` : ""}
            <span class="meta-badge">💼 ${t.trip_purpose || "General"}</span>
            <span class="meta-badge">💰 ₹${t.fare_cost || 0}</span>
            <span class="meta-badge">🛣️ ${dist} (${dur})</span>
          </div>
          ${t.note ? `<p class="trip-note-text">"${t.note}"</p>` : ""}
        </div>
        <div class="trip-card-footer">
          <span>Mood: ${emoji} ${t.mood || "sunny"}</span>
          <button class="btn-delete-trip" onclick="deleteTripById(${t.id})">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

(window as any).deleteTripById = async (id: number) => {
  if (!confirm("Are you sure you want to delete this trip record?")) return;
  try {
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadTrips();
      initStatusChecker();
    }
  } catch (e: any) {
    alert(`Delete failed: ${e.message}`);
  }
};

// Filter trips search
const tripSearchInput = document.getElementById("filter-trips-search");
if (tripSearchInput) {
  tripSearchInput.addEventListener("input", (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    const filtered = allTrips.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      (t.travel_mode && t.travel_mode.toLowerCase().includes(q))
    );
    renderTrips(filtered);
  });
}

const btnRefreshTrips = document.getElementById("btn-refresh-trips");
if (btnRefreshTrips) {
  btnRefreshTrips.addEventListener("click", () => loadTrips());
}

// AI Route Planner (Preserved Endpoint)
function initAIRoutePlanner() {
  const btn = document.getElementById("btn-plan-route");
  const input = document.getElementById("route-prompt-input") as HTMLInputElement;
  const resultBox = document.getElementById("route-result-box");
  if (!btn || !input || !resultBox) return;
  btn.addEventListener("click", async () => {
    const prompt = input.value.trim();
    if (!prompt) return alert("Please enter route stops");
    btn.textContent = "Calculating AI Route... 🧭";
    try {
      const res = await fetch("/api/ai/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      resultBox.classList.remove("hidden");
      (document.getElementById("route-mode-badge") as HTMLElement).textContent = data.mode === "google" ? "Live Google Routes" : "AI Smart Route (Demo)";
      (document.getElementById("route-dist-badge") as HTMLElement).textContent = `Distance: ${data.distance}`;
      (document.getElementById("route-dur-badge") as HTMLElement).textContent = `Duration: ${data.duration}`;
      const stopsList = document.getElementById("route-stops-list");
      if (stopsList) {
        stopsList.innerHTML = (data.stops || []).map((s: string, idx: number) => `<span class="stop-chip">${idx + 1}. ${s}</span>`).join(" ");
      }
      (document.getElementById("route-note-msg") as HTMLElement).textContent = data.message || "";
      const mapsLink = document.getElementById("route-maps-link") as HTMLAnchorElement;
      if (mapsLink) mapsLink.href = data.mapsUrl || "#";
    } catch (e: any) {
      alert(`Route error: ${e.message}`);
    } finally {
      btn.textContent = "Plan AI Route 🧭";
    }
  });
}

// AI Itinerary Planner
function initAIItinerary() {
  const btn = document.getElementById("btn-generate-itinerary");
  const destSelect = document.getElementById("itinerary-dest-select") as HTMLSelectElement;
  const daysSelect = document.getElementById("itinerary-days-select") as HTMLSelectElement;
  const budgetSelect = document.getElementById("itinerary-budget-select") as HTMLSelectElement;
  const resultBox = document.getElementById("itinerary-result-box");
  if (!btn || !destSelect || !resultBox) return;
  btn.addEventListener("click", async () => {
    btn.textContent = "Curating Itinerary... ✨";
    try {
      const res = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destSelect.value,
          days: parseInt(daysSelect.value) || 3,
          budget: budgetSelect.value,
        }),
      });
      const data = await res.json();
      resultBox.classList.remove("hidden");
      (document.getElementById("itinerary-title") as HTMLElement).textContent = `Plan for ${data.destination} (${data.days} Days)`;
      (document.getElementById("itinerary-summary") as HTMLElement).textContent = data.summary;
      (document.getElementById("itinerary-budget-badge") as HTMLElement).textContent = `Est. Budget: ${data.estimated_budget}`;
      (document.getElementById("itinerary-season-badge") as HTMLElement).textContent = `Best Season: ${data.best_time}`;
      const timeline = document.getElementById("itinerary-timeline");
      if (timeline) {
        timeline.innerHTML = data.daily_plan.map((d: any) => `
          <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; margin-top: 10px; border-left: 3px solid var(--primary);">
            <h5 style="color: #34d399; margin-bottom: 4px;">${d.theme}</h5>
            <p style="font-size: 13px; margin: 3px 0;">🌅 <strong>Morning:</strong> ${d.morning}</p>
            <p style="font-size: 13px; margin: 3px 0;">☀️ <strong>Afternoon:</strong> ${d.afternoon}</p>
            <p style="font-size: 13px; margin: 3px 0;">🌙 <strong>Evening:</strong> ${d.evening}</p>
            <p style="font-size: 12px; color: #fbbf24; margin-top: 6px;">🍛 <strong>Food Highlights:</strong> ${d.food_recommendations.join(", ")}</p>
            <p style="font-size: 12px; color: #60a5fa; margin-top: 2px;">🚌 <strong>Transit Mode:</strong> ${d.transport_mode}</p>
          </div>
        `).join("");
      }
    } catch (e: any) {
      alert(`Itinerary error: ${e.message}`);
    } finally {
      btn.textContent = "Generate AI Itinerary ✨";
    }
  });
}

// Tourism Explorer
async function loadDestinations() {
  const grid = document.getElementById("destinations-grid");
  if (!grid) return;
  grid.innerHTML = "<p class='text-muted'>Loading tourism records from Python database...</p>";
  try {
    const res = await fetch("/api/tourism/destinations");
    if (res.ok) {
      allDestinations = await res.json();
      renderDestinations(allDestinations);
    }
  } catch (e: any) {
    grid.innerHTML = `<p class='text-muted'>Error loading tourism records: ${e.message}</p>`;
  }
}

function renderDestinations(dests: Destination[]) {
  const grid = document.getElementById("destinations-grid");
  if (!grid) return;
  let filtered = dests;
  if (currentCategoryFilter !== "all") {
    filtered = dests.filter((d) =>
      d.category.toLowerCase().includes(currentCategoryFilter) ||
      d.state_region.toLowerCase().includes(currentCategoryFilter)
    );
  }
  if (filtered.length === 0) {
    grid.innerHTML = "<p class='text-muted'>No destinations match this filter. Use the live search to fetch any city!</p>";
    return;
  }
  grid.innerHTML = filtered.map((d) => {
    const foodList = Array.isArray(d.food_cuisine) ? d.food_cuisine.slice(0, 2).join(", ") : "Local delicacies";
    const attractions = Array.isArray(d.attractions) ? d.attractions.slice(0, 2).join(", ") : "Sightseeing locations";
    return `
      <div class="dest-card" onclick="openDestinationModal('${d.name.replace(/'/g, "\\\\'")}')">
        <div class="dest-img-box">
          <img src="${d.image_url || "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800"}" alt="${d.name}" loading="lazy" />
          <span class="dest-rating-tag">⭐ ${d.ratings || 4.5}</span>
        </div>
        <div class="dest-body">
          <h3 class="dest-name">${d.name}</h3>
          <span class="dest-region">📍 ${d.state_region} • ${d.category}</span>
          <p class="dest-desc">${d.description}</p>
          <div class="dest-features">
            <div>🍛 <strong>Cuisine:</strong> ${foodList}</div>
            <div>🏛️ <strong>Sightseeing:</strong> ${attractions}</div>
            <div>🌦️ <strong>Weather:</strong> ${d.weather_summary}</div>
          </div>
          <div class="dest-footer">
            <span class="dest-price">₹${d.approx_cost_per_day || 2500}/day</span>
            <span style="color: var(--primary); font-weight: 600;">View Details & APIs ➔</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function initTourismExplorer() {
  const catPills = document.querySelectorAll(".cat-pill");
  catPills.forEach((btn) => {
    btn.addEventListener("click", () => {
      catPills.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      currentCategoryFilter = btn.getAttribute("data-cat") || "all";
      renderDestinations(allDestinations);
    });
  });

  const btnFetch = document.getElementById("btn-fetch-live-dest");
  const searchInput = document.getElementById("live-search-input") as HTMLInputElement;
  if (btnFetch && searchInput) {
    btnFetch.addEventListener("click", async () => {
      const place = searchInput.value.trim();
      if (!place) return alert("Please enter a destination name (e.g. Varkala, Kozhikode, Goa)");
      btnFetch.textContent = "Fetching Live APIs 🌐...";
      try {
        const res = await fetch("/api/tourism/fetch-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place_name: place }),
        });
        if (res.ok) {
          const dest = await res.json();
          alert(`✅ Successfully pulled real-world data from OpenStreetMap, Wikivoyage & Open-Meteo for ${dest.name}!`);
          loadDestinations();
          openDestinationModal(dest.name);
        } else {
          alert("Could not fetch destination from live APIs.");
        }
      } catch (e: any) {
        alert(`API Fetch error: ${e.message}`);
      } finally {
        btnFetch.textContent = "Fetch Live 🌐";
      }
    });
  }
}

(window as any).openDestinationModal = async (name: string) => {
  const modal = document.getElementById("dest-modal");
  const content = document.getElementById("modal-content");
  if (!modal || !content) return;
  modal.classList.remove("hidden");
  content.innerHTML = "<p class='text-muted'>Fetching live destination package & weather...</p>";

  try {
    const res = await fetch(`/api/tourism/destination/${encodeURIComponent(name)}`);
    const dest: Destination = await res.json();
    const foods = Array.isArray(dest.food_cuisine) ? dest.food_cuisine : [];
    const attractions = Array.isArray(dest.attractions) ? dest.attractions : [];
    const hotels = Array.isArray(dest.hotels) ? dest.hotels : [];
    const activities = Array.isArray(dest.activities) ? dest.activities : [];

    content.innerHTML = `
      <div style="position: relative; height: 220px; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        <img src="${dest.image_url}" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 16px;">
          <h2 style="font-size: 24px; color: #fff;">${dest.name}</h2>
          <span style="color: var(--primary); font-size: 13px;">📍 ${dest.state_region} • ⭐ ${dest.ratings} Rating • Source: ${dest.source}</span>
        </div>
      </div>
      <p style="font-size: 14px; color: #d1d5db; line-height: 1.6; margin-bottom: 16px;">${dest.description}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #fbbf24; margin-bottom: 6px;">🍛 Local Cuisine & Specialties</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${foods.map((f: string) => `<li>${f}</li>`).join("")}
          </ul>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #60a5fa; margin-bottom: 6px;">🏛️ Top Sightseeing & Heritage</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${attractions.map((a: string) => `<li>${a}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #34d399; margin-bottom: 6px;">🏨 Hotels & Stays</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${hotels.map((h: any) => `<li><strong>${h.name}</strong> (${h.price_range || "N/A"})</li>`).join("")}
          </ul>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #f472b6; margin-bottom: 6px;">🎯 Activities & Experiences</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${activities.map((ac: string) => `<li>${ac}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--primary-glow); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div>🌦️ <strong>Weather & Climate:</strong> ${dest.weather_summary}</div>
          <div style="font-size: 12px; color: #9ca3af;">Best Season: ${dest.best_season} • Coordinates: ${dest.latitude.toFixed(4)}, ${dest.longitude.toFixed(4)}</div>
        </div>
        <span style="font-size: 16px; font-weight: 700; color: #34d399;">₹${dest.approx_cost_per_day}/day</span>
      </div>
    `;
  } catch (e: any) {
    content.innerHTML = `<p class='text-muted'>Failed to load destination details: ${e.message}</p>`;
  }
};

const btnCloseModal = document.getElementById("btn-close-modal");
if (btnCloseModal) {
  btnCloseModal.addEventListener("click", () => {
    document.getElementById("dest-modal")?.classList.add("hidden");
  });
}

// Analytics Loader
async function loadAnalytics() {
  try {
    const [summaryRes, modeRes, peakRes, odRes] = await Promise.all([
      fetch("/api/analytics/summary"),
      fetch("/api/analytics/mode-split"),
      fetch("/api/analytics/peak-hours"),
      fetch("/api/analytics/od-matrix"),
    ]);

    if (summaryRes.ok) {
      const sum = await summaryRes.json();
      (document.getElementById("kpi-trips") as HTMLElement).textContent = String(sum.total_trips);
      (document.getElementById("kpi-dist") as HTMLElement).textContent = `${sum.total_distance_km} km`;
      (document.getElementById("kpi-dur") as HTMLElement).textContent = `${sum.avg_duration_min} min`;
      (document.getElementById("kpi-passengers") as HTMLElement).textContent = String(sum.total_passengers);
      (document.getElementById("kpi-co2") as HTMLElement).textContent = `${sum.estimated_co2_kg} kg`;
    }

    if (modeRes.ok) {
      const modes = await modeRes.json();
      const bars = document.getElementById("mode-split-bars");
      if (bars) {
        bars.innerHTML = modes.map((m: any) => `
          <div class="bar-row">
            <div class="bar-label-row">
              <span>${m.travel_mode} (${m.trip_count} trips)</span>
              <span>${m.percentage}%</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${m.percentage}%;"></div>
            </div>
          </div>
        `).join("");
      }
    }

    if (peakRes.ok) {
      const hours = await peakRes.json();
      const container = document.getElementById("peak-hours-bars");
      if (container) {
        const maxCount = Math.max(...hours.map((h: any) => h.trip_count), 1);
        container.innerHTML = hours.map((h: any) => {
          const pct = Math.max((h.trip_count / maxCount) * 100, 6);
          return `
            <div class="histo-col" title="${h.label}: ${h.trip_count} departures">
              <div class="histo-bar" style="height: ${pct}%;"></div>
              <span class="histo-label">${h.hour}h</span>
            </div>
          `;
        }).join("");
      }
    }

    if (odRes.ok) {
      const od = await odRes.json();
      const tbody = document.getElementById("od-matrix-body");
      if (tbody) {
        tbody.innerHTML = od.map((row: any) => `
          <tr>
            <td><strong>${row.origin}</strong></td>
            <td><strong>${row.destination}</strong></td>
            <td><span class="trip-mode-tag">${row.travel_mode}</span></td>
            <td>${row.flow_volume} journeys</td>
            <td>${row.avg_duration} min</td>
            <td>${row.avg_distance} km</td>
          </tr>
        `).join("");
      }
    }
  } catch (e: any) {
    console.error("Analytics loading error:", e);
  }
}

function initAnalytics() {}

// SQL Console
function initSQLConsole() {
  const btnOpen = document.getElementById("btn-open-sql");
  const btnClose = document.getElementById("btn-close-sql");
  const modal = document.getElementById("sql-modal");
  const btnExec = document.getElementById("btn-execute-sql");
  const sqlInput = document.getElementById("sql-input") as HTMLTextAreaElement;
  const resultsTable = document.getElementById("sql-results-table");

  if (btnOpen && modal) {
    btnOpen.addEventListener("click", () => modal.classList.remove("hidden"));
  }
  if (btnClose && modal) {
    btnClose.addEventListener("click", () => modal.classList.add("hidden"));
  }
  if (btnExec && sqlInput && resultsTable) {
    btnExec.addEventListener("click", async () => {
      const sql = sqlInput.value.trim();
      if (!sql) return;
      btnExec.textContent = "Running Query... ⏳";
      try {
        const res = await fetch("/api/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql }),
        });
        const data = await res.json();
        if (res.ok) {
          const rows = data.rows || [];
          if (rows.length === 0) {
            resultsTable.innerHTML = `<p class="text-sm" style="color:#34d399;">Query executed successfully (Affected rows: ${data.rowCount}).</p>`;
            return;
          }
          const cols = Object.keys(rows[0]);
          resultsTable.innerHTML = `
            <table class="data-table">
              <thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
              <tbody>
                ${rows.map((r: any) => `<tr>${cols.map((c) => `<td>${r[c]}</td>`).join("")}</tr>`).join("")}
              </tbody>
            </table>
          `;
        } else {
          resultsTable.innerHTML = `<p class="text-sm" style="color:#f87171;">Error: ${data.error || data.detail}</p>`;
        }
      } catch (e: any) {
        resultsTable.innerHTML = `<p class="text-sm" style="color:#f87171;">Query error: ${e.message}</p>`;
      } finally {
        btnExec.textContent = "Execute Query ▶";
      }
    });
  }
}
"""

(SRC / "main.ts").write_text(main_ts, encoding="utf-8")
print("main.ts written successfully!")
