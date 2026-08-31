// TripTrail travel journal application (Standalone Mobile + Cloud Enabled)

let allTrips = [];
let allDestinations = [];
let currentCategoryFilter = "all";
let authToken = localStorage.getItem("triptrail_token") || "";
let authMode = "login";

const configuredApiUrl = document.querySelector('meta[name="triptrail-api-url"]')?.content?.trim() || "";
const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");

// Local Seed Destinations Dataset for Standalone Offline Operation
const SEED_DESTINATIONS = [
  {
    id: 1,
    name: "Munnar",
    state_region: "Idukki, Kerala",
    category: "Hills & Nature",
    description: "Famous hill station situated at 1,600m above sea level with vast tea plantations, misty valleys, and rare flora.",
    approx_cost_per_day: 3500,
    ratings: 4.8,
    image_url: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800",
    latitude: 10.0889,
    longitude: 77.0595,
    weather_summary: "Cool 18°C, Misty & Pleasant",
    best_season: "September to March",
    source: "Standalone Local Database",
    food_cuisine: ["Kerala Sadya", "Cardamom Tea", "Appam with Stew", "Puttu and Kadala"],
    attractions: ["Tea Museum", "Eravikulam National Park", "Mattupetty Dam", "Anamudi Peak"],
    hotels: [
      { name: "Tea County Resort", price_range: "₹4,500 - ₹8,000/night" },
      { name: "Windermere Estate", price_range: "₹6,000 - ₹12,000/night" }
    ],
    activities: ["Trekking", "Tea Tasting", "Wildlife Safari", "Photography"]
  },
  {
    id: 2,
    name: "Kochi (Cochin)",
    state_region: "Ernakulam, Kerala",
    category: "Heritage & Coastal",
    description: "Vibrant port city featuring Chinese fishing nets, Portuguese colonial history, bustling spice markets, and art cafes.",
    approx_cost_per_day: 3000,
    ratings: 4.7,
    image_url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800",
    latitude: 9.9312,
    longitude: 76.2673,
    weather_summary: "Humid 29°C, Coastal Breeze",
    best_season: "October to March",
    source: "Standalone Local Database",
    food_cuisine: ["Karimeen Pollichathu", "Kochi Seafood Curry", "Beef Roast", "Sulaimani Tea"],
    attractions: ["Fort Kochi Beach", "Mattancherry Palace", "Chinese Fishing Nets", "Jew Town"],
    hotels: [
      { name: "Brunton Boatyard", price_range: "₹7,000 - ₹15,000/night" },
      { name: "Fort House Hotel", price_range: "₹3,500 - ₹6,500/night" }
    ],
    activities: ["Heritage Walking Tour", "Sunset Cruise", "Art Gallery Visiting", "Kathakali Shows"]
  },
  {
    id: 3,
    name: "Alappuzha (Alleppey)",
    state_region: "Alappuzha, Kerala",
    category: "Backwaters & Beaches",
    description: "Venice of the East, famous for tranquil backwater houseboats, palm-fringed canals, and paddy fields.",
    approx_cost_per_day: 4000,
    ratings: 4.9,
    image_url: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?w=800",
    latitude: 9.4981,
    longitude: 76.3388,
    weather_summary: "Warm 28°C, Tropical",
    best_season: "November to February",
    source: "Standalone Local Database",
    food_cuisine: ["Duck Mappas", "Prawn Roast", "Toddy Shop Fish Fry", "Tapioca with Fish"],
    attractions: ["Vembanad Lake", "Alleppey Beach", "Kuttanad Rice Fields", "Krishnapuram Palace"],
    hotels: [
      { name: "Emerald Isle Heritage Resort", price_range: "₹4,000 - ₹8,500/night" },
      { name: "Luxury Houseboat Cruise", price_range: "₹8,000 - ₹18,000/night" }
    ],
    activities: ["Overnight Houseboat Stay", "Kayaking Canals", "Village Walks", "Beach Sunset"]
  },
  {
    id: 4,
    name: "Varkala",
    state_region: "Thiruvananthapuram, Kerala",
    category: "Beaches & Cliffs",
    description: "Stunning red cliffside beach destination with bohemian cafes, mineral springs, and ancient Janardanaswamy temple.",
    approx_cost_per_day: 2800,
    ratings: 4.7,
    image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
    latitude: 8.7379,
    longitude: 76.7163,
    weather_summary: "Sunny 30°C, Sea Breeze",
    best_season: "October to April",
    source: "Standalone Local Database",
    food_cuisine: ["Fresh Grilled Fish", "Smoothie Bowls", "Kerala Parotta", "Coconut Water"],
    attractions: ["Varkala Cliff & Beach", "Black Sand Beach", "Janardanaswamy Temple", "Anjengo Fort"],
    hotels: [
      { name: "Clafouti Beach Resort", price_range: "₹3,000 - ₹6,000/night" },
      { name: "Zostel Varkala", price_range: "₹1,200 - ₹3,000/night" }
    ],
    activities: ["Surfing", "Cliff Sunset Dining", "Ayurvedic Massage", "Yoga Sessions"]
  },
  {
    id: 5,
    name: "Wayanad",
    state_region: "Wayanad, Kerala",
    category: "Hills & Nature",
    description: "Picturesque plateau with spice plantations, ancient caves, cascading waterfalls, and wildlife sanctuaries.",
    approx_cost_per_day: 3200,
    ratings: 4.8,
    image_url: "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800",
    latitude: 11.6854,
    longitude: 76.132,
    weather_summary: "Pleasant 22°C, Forested",
    best_season: "October to May",
    source: "Standalone Local Database",
    food_cuisine: ["Bamboo Rice Payasam", "Malabar Chicken Curry", "Kattu Soup", "Steamed Bananas"],
    attractions: ["Edakkal Caves", "Chembra Peak", "Banasura Sagar Dam", "Muthanga Wildlife Sanctuary"],
    hotels: [
      { name: "Vythiri Resort", price_range: "₹8,000 - ₹16,000/night" },
      { name: "Wayanad Wild", price_range: "₹6,000 - ₹12,000/night" }
    ],
    activities: ["Cave Exploration", "Trekking to Heart Lake", "Ziplining", "Jungle Safari"]
  }
];

function getLocalTrips() {
  const data = localStorage.getItem("triptrail_local_trips");
  if (!data) {
    const defaultSeed = [
      {
        id: 101,
        title: "Morning Commute to Technopark",
        location: "Kollam to Thiruvananthapuram",
        origin: "Kollam",
        destination: "Thiruvananthapuram",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        departure_time: "08:15",
        arrival_time: "09:30",
        travel_mode: "Train",
        trip_purpose: "Work / Office",
        passenger_count: 1,
        fare_cost: 45,
        trip_number: 1,
        mood: "happy",
        note: "Express train journey, on time.",
        distance_km: 65,
        duration_min: 75,
        is_auto_detected: 1,
        is_synced: 1
      }
    ];
    localStorage.setItem("triptrail_local_trips", JSON.stringify(defaultSeed));
    return defaultSeed;
  }
  return safeJsonParse(data, []);
}

function saveLocalTrips(trips) {
  localStorage.setItem("triptrail_local_trips", JSON.stringify(trips));
}

function getLocalDestinations() {
  const data = localStorage.getItem("triptrail_local_destinations");
  if (!data) {
    localStorage.setItem("triptrail_local_destinations", JSON.stringify(SEED_DESTINATIONS));
    return SEED_DESTINATIONS;
  }
  return safeJsonParse(data, SEED_DESTINATIONS);
}

function saveLocalDestinations(dests) {
  localStorage.setItem("triptrail_local_destinations", JSON.stringify(dests));
}

async function safeResponseJson(res) {
  if (typeof res.json === "function") {
    try {
      return await res.json();
    } catch {
      // fallback
    }
  }
  const text = typeof res.text === "function" ? await res.text() : "";
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text.replace(/<[^>]*>?/gm, "").trim() || "HTTP response error" };
  }
}

function safeJsonParse(jsonString, fallback = null) {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("JSON parse error:", e);
    return fallback;
  }
}

// Unified API fetcher with automatic Standalone Offline Fallback
async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;

  try {
    const res = await fetch(targetUrl, { ...options, headers });
    if (res.ok || (res.status >= 200 && res.status < 400)) {
      return res;
    }
    // If backend returns 404 or 5xx, try fallback
    return await handleOfflineFallback(url, options);
  } catch (err) {
    // Network failure (offline / backend server down) -> Use standalone offline engine
    return await handleOfflineFallback(url, options);
  }
}

// Standalone Engine Mock Response Constructor
function mockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

// Client-Side Offline Engine Handler
async function handleOfflineFallback(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? safeJsonParse(options.body, {}) : {};

  // Status Check
  if (url === "/api/status") {
    const trips = getLocalTrips();
    const dests = getLocalDestinations();
    return mockResponse({
      connected: true,
      version: "Standalone Mobile Engine (Offline SQLite/LocalStorage)",
      checkedAt: new Date().toISOString(),
      mode: "standalone_local",
      trips_count: trips.length,
      destinations_count: dests.length
    });
  }

  // Auth Me
  if (url === "/api/auth/me") {
    const savedUser = safeJsonParse(localStorage.getItem("triptrail_user"));
    if (savedUser) return mockResponse(savedUser);
    return mockResponse({ detail: "Not authenticated" }, 401);
  }

  // Auth Login / Register
  if (url === "/api/auth/login" || url === "/api/auth/register") {
    const name = body.name || (body.email ? body.email.split("@")[0] : "Traveler");
    const user = { id: 1, email: body.email || "user@triptrail.local", name: name, theme: "system" };
    const token = `offline_token_${Date.now()}`;
    localStorage.setItem("triptrail_user", JSON.stringify(user));
    return mockResponse({ token, user });
  }

  // Auth Theme
  if (url.startsWith("/api/auth/theme")) {
    return mockResponse({ success: true });
  }

  // Trips Listing
  if (url === "/api/trips" && method === "GET") {
    return mockResponse(getLocalTrips());
  }

  // Create Trip
  if (url === "/api/trips" && method === "POST") {
    const trips = getLocalTrips();
    const newTrip = {
      id: Date.now(),
      ...body,
      is_synced: 0
    };
    trips.unshift(newTrip);
    saveLocalTrips(trips);
    return mockResponse(newTrip, 201);
  }

  // Delete Trip
  if (url.startsWith("/api/trips/") && method === "DELETE") {
    const parts = url.split("/");
    const idToDelete = Number(parts[parts.length - 1]);
    let trips = getLocalTrips();
    trips = trips.filter((t) => t.id !== idToDelete);
    saveLocalTrips(trips);
    return mockResponse({ message: "Trip deleted locally" });
  }

  // Destinations List
  if (url === "/api/tourism/destinations" && method === "GET") {
    return mockResponse(getLocalDestinations());
  }

  // Single Destination
  if (url.startsWith("/api/tourism/destination/")) {
    const encodedName = url.replace("/api/tourism/destination/", "");
    const destName = decodeURIComponent(encodedName).toLowerCase();
    const dests = getLocalDestinations();
    const found = dests.find((d) => d.name.toLowerCase() === destName) || dests[0];
    return mockResponse(found);
  }

  // Fetch Live Destination (Local Heuristic Fallback)
  if (url === "/api/tourism/fetch-live" && method === "POST") {
    const place = body.place_name || "New Destination";
    const dests = getLocalDestinations();
    const newDest = {
      id: Date.now(),
      name: place,
      state_region: "India",
      category: "Exploration",
      description: `Discovered destination ${place} logged offline in TripTrail mobility journal.`,
      approx_cost_per_day: 2500,
      ratings: 4.6,
      image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      latitude: 10.0,
      longitude: 76.5,
      weather_summary: "Sunny 27°C",
      best_season: "October to March",
      source: "Standalone Search",
      food_cuisine: ["Local Special Thali", "Street Snacks", "Traditional Desserts"],
      attractions: ["Town Center", "Scenic Viewpoint", "Historical Landmark"],
      hotels: [{ name: "Central Heritage Hotel", price_range: "₹2,500 - ₹5,000/night" }],
      activities: ["City Walking Tour", "Local Shopping", "Photography"]
    };
    dests.unshift(newDest);
    saveLocalDestinations(dests);
    return mockResponse(newDest);
  }

  // AI Trip Prompt Parsing (Offline Heuristic Parser)
  if (url === "/api/ai/parse-trip" && method === "POST") {
    const text = (body.text || "").toLowerCase();
    let mode = "Bus";
    if (text.includes("train") || text.includes("rail")) mode = "Train";
    else if (text.includes("car") || text.includes("cab") || text.includes("uber")) mode = "Car";
    else if (text.includes("auto") || text.includes("rickshaw")) mode = "Auto";
    else if (text.includes("metro")) mode = "Metro";
    else if (text.includes("bike") || text.includes("scooter") || text.includes("two wheeler")) mode = "Two-Wheeler";
    else if (text.includes("flight") || text.includes("plane")) mode = "Flight";

    let purpose = "Leisure / Sightseeing";
    if (text.includes("work") || text.includes("office") || text.includes("client")) purpose = "Work / Office";
    else if (text.includes("college") || text.includes("school") || text.includes("exam")) purpose = "Education";
    else if (text.includes("shop") || text.includes("market") || text.includes("buy")) purpose = "Shopping";

    // Extract numbers for fare
    const fareMatch = text.match(/(?:rs\.?|₹|inr|cost|fare)\s*(\d+)/i) || text.match(/(\d+)\s*(?:rs|rupees)/i);
    const fareCost = fareMatch ? parseInt(fareMatch[1]) : 120;

    return mockResponse({
      success: true,
      travel_mode: mode,
      origin: "Current Location",
      destination: "Destination Spot",
      trip_purpose: purpose,
      departure_time: "09:00",
      arrival_time: "10:30",
      fare_cost: fareCost,
      title: `${mode} Journey (${purpose})`,
      note: `Auto-extracted from: "${body.text}"`
    });
  }

  // AI Route Calculation (Offline Geo Math)
  if (url === "/api/ai/route" && method === "POST") {
    const prompt = body.prompt || "Route";
    const stops = prompt.split(/to|->|—|,|\n/).map((s) => s.trim()).filter(Boolean);
    const origin = stops[0] || "Origin";
    const dest = stops[stops.length - 1] || "Destination";
    const metrics = estimateTripMetrics(origin, dest, "Car");
    return mockResponse({
      mode: "standalone_ai",
      distance: `${metrics.distanceKm} km`,
      duration: `${metrics.durationMin} min`,
      stops: stops.length > 0 ? stops : [origin, dest],
      mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`,
      message: "Offline Smart Route estimated using local mobility algorithms."
    });
  }

  // AI Itinerary Curation (Offline Smart Generator)
  if (url === "/api/ai/itinerary" && method === "POST") {
    const dest = body.destination || "Kerala";
    const days = body.days || 3;
    const budget = body.budget || "Moderate";

    const dailyPlan = [];
    for (let i = 1; i <= days; i++) {
      dailyPlan.push({
        day: i,
        theme: `Day ${i}: Discovering ${dest} Highlights`,
        morning: `Morning exploration of top rated landmarks and heritage spots around ${dest}.`,
        afternoon: `Scenic lunch break followed by cultural site visits and local artisan markets.`,
        evening: `Sunset viewing, relaxed promenade stroll, and authentic evening cuisine tasting.`,
        food_recommendations: ["Local Special Thali", "Fresh Coconut Refreshment", "Traditional Evening Snacks"],
        transport_mode: i % 2 === 0 ? "Local Bus / Auto" : "Private Taxi / Walk"
      });
    }

    return mockResponse({
      destination: dest,
      days: days,
      estimated_budget: budget === "Budget" ? `₹${days * 1800}` : budget === "Luxury" ? `₹${days * 7500}` : `₹${days * 3500}`,
      best_time: "October to March",
      summary: `Smart ${days}-day curated travel itinerary for ${dest} with mobility insights.`,
      daily_plan: dailyPlan
    });
  }

  // Reverse Geocoding Fallback
  if (url === "/api/geocode/reverse") {
    const lat = body.lat || 8.5241;
    const lng = body.lng || 76.9366;
    return mockResponse({
      locality: "Auto-Sensed Spot",
      district: "Kerala Region",
      display_name: `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`
    });
  }

  // Generic fallback
  return mockResponse({ message: "Action recorded locally." });
}

const KNOWN_ROUTE_COORDS = {
  thiruvananthapuram: [8.5241, 76.9366],
  trivandrum: [8.5241, 76.9366],
  kochi: [9.9312, 76.2673],
  cochin: [9.9312, 76.2673],
  ernakulam: [9.9816, 76.2999],
  alappuzha: [9.4981, 76.3388],
  alleppey: [9.4981, 76.3388],
  munnar: [10.0889, 77.0595],
  wayanad: [11.6854, 76.132],
  kollam: [8.8932, 76.6141],
  thrissur: [10.5276, 76.2144],
  kannur: [11.8745, 75.3704],
  varkala: [8.7379, 76.7163],
  kovalam: [8.4004, 76.9787],
  thekkady: [9.6031, 77.1615],
  kozhikode: [11.2588, 75.7804],
  calicut: [11.2588, 75.7804],
  goa: [15.2993, 74.124],
  mysuru: [12.2958, 76.6394],
  mysore: [12.2958, 76.6394],
};

function haversineKm(coordA, coordB) {
  const [lat1, lon1] = coordA;
  const [lat2, lon2] = coordB;
  const toRad = (v) => (v * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTripMetrics(origin, destination, mode = "Bus") {
  const originKey = (origin || "").trim().toLowerCase().split(",")[0].trim();
  const destinationKey = (destination || "").trim().toLowerCase().split(",")[0].trim();

  const originCoord = KNOWN_ROUTE_COORDS[originKey] || KNOWN_ROUTE_COORDS["thiruvananthapuram"];
  const destinationCoord = KNOWN_ROUTE_COORDS[destinationKey] || KNOWN_ROUTE_COORDS["kochi"];
  const directKm = haversineKm(originCoord, destinationCoord);

  const speeds = {
    Bus: 32,
    Train: 52,
    Metro: 40,
    Auto: 22,
    Car: 46,
    "Two-Wheeler": 35,
    Walking: 4,
    Bicycle: 12,
    Ferry: 18,
    Flight: 260,
  };

  const distanceKm = Math.max(3, Number((directKm * 1.28).toFixed(1)));
  const durationMin = Math.max(15, Math.round((distanceKm / (speeds[mode] || 34)) * 60));
  return { distanceKm, durationMin };
}

function initTheme() {
  const button = document.getElementById("btn-theme");
  const saved = localStorage.getItem("triptrail_theme") || "system";
  applyTheme(saved);
  button?.addEventListener("click", async () => {
    const current = localStorage.getItem("triptrail_theme") || "system";
    const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
    applyTheme(next);
    if (authToken) {
      await apiFetch(`/api/auth/theme?theme=${encodeURIComponent(next)}`, { method: "PATCH" });
    }
  });
}

function applyTheme(theme) {
  localStorage.setItem("triptrail_theme", theme);
  document.documentElement.dataset.theme = theme;
  const button = document.getElementById("btn-theme");
  if (button) button.textContent = `Theme: ${theme}`;
}

function initAuth() {
  const modal = document.getElementById("auth-modal");
  const form = document.getElementById("auth-form");
  const toggle = document.getElementById("btn-toggle-auth-mode");
  const open = document.getElementById("btn-auth");
  const close = document.getElementById("btn-close-auth");
  const nameGroup = document.getElementById("auth-name-group");
  const title = document.getElementById("auth-title");
  const error = document.getElementById("auth-error");
  const userLabel = document.getElementById("auth-user-label");

  const setMode = (mode) => {
    authMode = mode;
    const register = mode === "register";
    if (nameGroup) nameGroup.classList.toggle("hidden", !register);
    const nameInput = document.getElementById("auth-name");
    if (nameInput) nameInput.required = register;
    if (title) title.textContent = register ? "Create your TripTrail account" : "Welcome back";
    if (toggle) toggle.textContent = register ? "Already have an account? Sign in" : "Need an account? Register";
  };

  const show = () => modal?.classList.remove("hidden");
  open?.addEventListener("click", () => {
    if (authToken) {
      authToken = "";
      localStorage.removeItem("triptrail_token");
      localStorage.removeItem("triptrail_user");
      if (userLabel) userLabel.textContent = "";
      open.textContent = "Sign in";
      loadTrips();
      return;
    }
    setMode("login"); show();
  });

  close?.addEventListener("click", () => modal?.classList.add("hidden"));
  toggle?.addEventListener("click", () => setMode(authMode === "login" ? "register" : "login"));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (error) error.textContent = "";
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
    const body = { email: document.getElementById("auth-email").value, password: document.getElementById("auth-password").value };
    if (authMode === "register") body.name = document.getElementById("auth-name").value;

    try {
      const response = await apiFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await safeResponseJson(response);
      if (!response.ok) throw new Error(data.detail || "Authentication failed.");
      authToken = data.token;
      localStorage.setItem("triptrail_token", authToken);
      if (userLabel) userLabel.textContent = `Hi, ${data.user.name}`;
      if (open) open.textContent = "Sign out";
      if (data.user.theme) applyTheme(data.user.theme);
      modal?.classList.add("hidden");
      loadTrips();
    } catch (err) {
      if (error) error.textContent = err.message;
    }
  });

  if (authToken) {
    apiFetch("/api/auth/me").then((response) => response.ok ? safeResponseJson(response) : Promise.reject()).then((user) => {
      if (userLabel && user) userLabel.textContent = `Hi, ${user.name}`;
      if (open) open.textContent = "Sign out";
      if (user && user.theme) applyTheme(user.theme);
    }).catch(() => {
      authToken = "";
      localStorage.removeItem("triptrail_token");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initTheme();
  initTabs();
  initStatusChecker();
  initTripLogger();
  initGPSAutoDetect();
  initAIPromptParser();
  initAIRoutePlanner();
  initAIItinerary();
  initTourismExplorer();
  loadTrips();
  loadDestinations();
  setDefaultDates();
});

function setDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  const startInput = document.getElementById("trip-start-date");
  const endInput = document.getElementById("trip-end-date");
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
      if (targetId === "tab-tourism") loadDestinations();
    });
  });
}

// Status Checker
async function initStatusChecker() {
  const pill = document.getElementById("db-status-pill");
  if (!pill) return;
  try {
    const res = await apiFetch("/api/status");
    if (res.ok) {
      const data = await safeResponseJson(res);
      pill.className = "status-pill status-connected";
      if (data.mode === "standalone_local") {
        pill.innerHTML = `<span class="status-dot"></span><span class="status-label">📱 Mobile Standalone (${data.trips_count} trips)</span>`;
      } else {
        pill.innerHTML = `<span class="status-dot"></span><span class="status-label">🟢 Cloud Synced (${data.trips_count})</span>`;
      }
    } else {
      pill.className = "status-pill status-connected";
      pill.innerHTML = `<span class="status-dot"></span><span class="status-label">📱 Standalone Mode</span>`;
    }
  } catch {
    pill.className = "status-pill status-connected";
    pill.innerHTML = `<span class="status-dot"></span><span class="status-label">📱 Standalone Mode</span>`;
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
          const res = await apiFetch("/api/geocode/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await safeResponseJson(res);
          const originInput = document.getElementById("trip-origin");
          const titleInput = document.getElementById("trip-title");
          const placeName = data.locality ? `${data.locality}, ${data.district}` : data.display_name;
          if (originInput) originInput.value = placeName;
          if (titleInput && !titleInput.value) {
            titleInput.value = `Journey from ${data.locality || "Current Location"}`;
          }
          if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> GPS: ${data.locality || "Auto-Detected"}`;
        } catch {
          const originInput = document.getElementById("trip-origin");
          if (originInput) originInput.value = `Lat: ${lat.toFixed(3)}, Lng: ${lng.toFixed(3)}`;
          if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> GPS Acquired`;
        }
      },
      (err) => {
        if (btnQuick) btnQuick.innerHTML = `<span class="btn-icon-inner">📍</span> Auto-Detect GPS Location`;
        const originInput = document.getElementById("trip-origin");
        if (originInput && !originInput.value) originInput.value = "Thiruvananthapuram, Kerala";
        alert(`GPS Notice: Using default location (${err.message})`);
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
  const input = document.getElementById("ai-trip-text-input");
  if (!btn || !input) return;
  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) {
      alert("Please enter a journey description first.");
      return;
    }
    btn.textContent = "Extracting... ⚡";
    try {
      const res = await apiFetch("/api/ai/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await safeResponseJson(res);
      if (data.success) {
        (document.getElementById("trip-title")).value = data.title || "Parsed Trip";
        (document.getElementById("trip-origin")).value = data.origin || "Origin";
        (document.getElementById("trip-destination")).value = data.destination || "Destination";
        (document.getElementById("trip-purpose")).value = data.trip_purpose || "General";
        (document.getElementById("trip-dep-time")).value = data.departure_time || "09:00";
        (document.getElementById("trip-arr-time")).value = data.arrival_time || "10:00";
        (document.getElementById("trip-fare")).value = String(data.fare_cost || 0);
        (document.getElementById("trip-note")).value = data.note || "";
        const modeRadios = document.querySelectorAll("input[name='travel_mode']");
        modeRadios.forEach((r) => {
          if (r.value.toLowerCase() === (data.travel_mode || "").toLowerCase()) r.checked = true;
        });
        alert(`✨ AI Auto-Filled Form:\n• Mode: ${data.travel_mode}\n• Origin: ${data.origin}\n• Destination: ${data.destination}\n• Purpose: ${data.trip_purpose}\n• Fare: ₹${data.fare_cost}`);
      }
    } catch (e) {
      alert(`AI parsing result: ${e.message}`);
    } finally {
      btn.textContent = "Auto-Fill Form 🚀";
    }
  });
}

// Personal trip form submission
function initTripLogger() {
  const form = document.getElementById("trip-survey-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedMode = (document.querySelector("input[name='travel_mode']:checked"))?.value || "Bus";
    const title = (document.getElementById("trip-title")).value.trim() || "My Journey";
    const origin = (document.getElementById("trip-origin")).value.trim() || "Origin";
    const destination = (document.getElementById("trip-destination")).value.trim() || "Destination";
    const location = `${origin} to ${destination}`;
    const startDate = (document.getElementById("trip-start-date")).value;
    const endDate = (document.getElementById("trip-end-date")).value;
    const depTime = (document.getElementById("trip-dep-time")).value;
    const arrTime = (document.getElementById("trip-arr-time")).value;
    const purpose = (document.getElementById("trip-purpose")).value;
    const fare = parseFloat((document.getElementById("trip-fare")).value) || 0.0;
    const passengers = parseInt((document.getElementById("trip-passengers")).value) || 1;
    const seq = parseInt((document.getElementById("trip-sequence")).value) || 1;
    const mood = (document.getElementById("trip-mood")).value;
    const note = (document.getElementById("trip-note")).value.trim();
    const estimatedMetrics = estimateTripMetrics(origin, destination, selectedMode);

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
      distance_km: estimatedMetrics.distanceKm,
      duration_min: estimatedMetrics.durationMin,
      is_auto_detected: 1,
      is_synced: 1
    };

    try {
      const res = await apiFetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("✅ Trip journey saved successfully!");
        (document.getElementById("trip-title")).value = "";
        (document.getElementById("trip-destination")).value = "";
        (document.getElementById("trip-note")).value = "";
        (document.getElementById("trip-sequence")).value = String(seq + 1);
        loadTrips();
        initStatusChecker();
      } else {
        const err = await safeResponseJson(res);
        alert(`Notice: ${err.error || err.detail || 'Trip saved locally.'}`);
        loadTrips();
      }
    } catch (e) {
      alert(`Submission notice: ${e.message}`);
    }
  });
}

// Load Trips List
async function loadTrips() {
  const grid = document.getElementById("trips-grid");
  if (!grid) return;
  grid.innerHTML = "<p class='text-muted'>Loading journeys...</p>";
  try {
    const res = await apiFetch("/api/trips");
    if (res.ok) {
      allTrips = await safeResponseJson(res);
      renderTrips(allTrips);
    }
  } catch (e) {
    grid.innerHTML = `<p class='text-muted'>Failed to load trips: ${e.message}</p>`;
  }
}

function renderTrips(trips) {
  const grid = document.getElementById("trips-grid");
  if (!grid) return;
  if (!trips || trips.length === 0) {
    grid.innerHTML = "<div class='card-box'><p class='text-muted'>No trip records found. Log your first trip using the Trip Logger tab!</p></div>";
    return;
  }
  grid.innerHTML = trips.map((t) => {
    const moodEmoji = { sunny: "☀️", happy: "😊", chill: "🌊", adventurous: "⛰️", rainy: "🌧️" };
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

window.deleteTripById = async (id) => {
  if (!confirm("Are you sure you want to delete this trip record?")) return;
  try {
    const res = await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadTrips();
      initStatusChecker();
    }
  } catch (e) {
    alert(`Delete notice: ${e.message}`);
  }
};

// Filter trips search
const tripSearchInput = document.getElementById("filter-trips-search");
if (tripSearchInput) {
  tripSearchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allTrips.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      (t.travel_mode && t.travel_mode.toLowerCase().includes(q))
    );
    renderTrips(filtered);
  });
}

const btnRefreshTrips = document.getElementById("btn-refresh-trips");
if (btnRefreshTrips) {
  btnRefreshTrips.addEventListener("click", () => loadTrips());
}

// AI Route Planner
function initAIRoutePlanner() {
  const btn = document.getElementById("btn-plan-route");
  const input = document.getElementById("route-prompt-input");
  const resultBox = document.getElementById("route-result-box");
  if (!btn || !input || !resultBox) return;
  btn.addEventListener("click", async () => {
    const prompt = input.value.trim();
    if (!prompt) return alert("Please enter route stops");
    btn.textContent = "Calculating AI Route... 🧭";
    try {
      const res = await apiFetch("/api/ai/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await safeResponseJson(res);
      resultBox.classList.remove("hidden");
      (document.getElementById("route-mode-badge")).textContent = data.mode === "google" ? "Live Google Routes" : "AI Smart Route";
      (document.getElementById("route-dist-badge")).textContent = `Distance: ${data.distance}`;
      (document.getElementById("route-dur-badge")).textContent = `Duration: ${data.duration}`;
      const stopsList = document.getElementById("route-stops-list");
      if (stopsList) {
        stopsList.innerHTML = (data.stops || []).map((s, idx) => `<span class="stop-chip">${idx + 1}. ${s}</span>`).join(" ");
      }
      
      const noteMsg = document.getElementById("route-note-msg");
      if (noteMsg) {
        noteMsg.textContent = data.message || "";
        if (!data.message) {
          noteMsg.classList.add("hidden");
        } else {
          noteMsg.classList.remove("hidden");
        }
      }

      // Synchronize with AI Tourism Itinerary
      if (data.stops && data.stops.length > 0) {
        const destSelect = document.getElementById("itinerary-dest-select");
        if (destSelect) {
          let routeOpt = destSelect.querySelector('option[value="planned-route"]');
          if (!routeOpt) {
            routeOpt = document.createElement("option");
            routeOpt.value = "planned-route";
            destSelect.insertBefore(routeOpt, destSelect.firstChild);
          }
          routeOpt.textContent = `📍 Planned Route: ${data.stops.join(" ➔ ")}`;
          routeOpt.dataset.routeStops = JSON.stringify(data.stops);
          destSelect.value = "planned-route";
        }
      }

      const mapsLink = document.getElementById("route-maps-link");
      if (mapsLink) mapsLink.href = data.mapsUrl || "#";
    } catch (e) {
      alert(`Route error: ${e.message}`);
    } finally {
      btn.textContent = "Plan AI Route 🧭";
    }
  });
}

// AI Itinerary Planner
function initAIItinerary() {
  const btn = document.getElementById("btn-generate-itinerary");
  const destSelect = document.getElementById("itinerary-dest-select");
  const daysSelect = document.getElementById("itinerary-days-select");
  const budgetSelect = document.getElementById("itinerary-budget-select");
  const resultBox = document.getElementById("itinerary-result-box");
  if (!btn || !destSelect || !resultBox) return;
  btn.addEventListener("click", async () => {
    btn.textContent = "Curating Itinerary... ✨";
    let destVal = destSelect.value;
    if (destVal === "planned-route") {
      const routeOpt = destSelect.querySelector('option[value="planned-route"]');
      if (routeOpt && routeOpt.dataset.routeStops) {
        try {
          const stopsArr = safeJsonParse(routeOpt.dataset.routeStops, []);
          destVal = stopsArr.join(" -> ");
        } catch (e) {
          console.error("Error parsing route stops", e);
        }
      }
    }
    try {
      const res = await apiFetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: destVal,
          days: parseInt(daysSelect.value) || 3,
          budget: budgetSelect.value,
        }),
      });
      const data = await safeResponseJson(res);
      resultBox.classList.remove("hidden");
      (document.getElementById("itinerary-title")).textContent = `Plan for ${data.destination} (${data.days} Days)`;
      (document.getElementById("itinerary-summary")).textContent = data.summary;
      (document.getElementById("itinerary-budget-badge")).textContent = `Est. Budget: ${data.estimated_budget}`;
      (document.getElementById("itinerary-season-badge")).textContent = `Best Season: ${data.best_time}`;
      const timeline = document.getElementById("itinerary-timeline");
      if (timeline) {
        timeline.innerHTML = (data.daily_plan || []).map((d) => `
          <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; margin-top: 10px; border-left: 3px solid var(--primary);">
            <h5 style="color: #34d399; margin-bottom: 4px;">${d.theme}</h5>
            <p style="font-size: 13px; margin: 3px 0;">🌅 <strong>Morning:</strong> ${d.morning}</p>
            <p style="font-size: 13px; margin: 3px 0;">☀️ <strong>Afternoon:</strong> ${d.afternoon}</p>
            <p style="font-size: 13px; margin: 3px 0;">🌙 <strong>Evening:</strong> ${d.evening}</p>
            <p style="font-size: 12px; color: #fbbf24; margin-top: 6px;">🍛 <strong>Food Highlights:</strong> ${(d.food_recommendations || []).join(", ")}</p>
            <p style="font-size: 12px; color: #60a5fa; margin-top: 2px;">🚌 <strong>Transit Mode:</strong> ${d.transport_mode}</p>
          </div>
        `).join("");
      }
    } catch (e) {
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
  grid.innerHTML = "<p class='text-muted'>Loading tourism records...</p>";
  try {
    const res = await apiFetch("/api/tourism/destinations");
    if (res.ok) {
      allDestinations = await safeResponseJson(res);
      renderDestinations(allDestinations);
    }
  } catch (e) {
    grid.innerHTML = `<p class='text-muted'>Error loading tourism records: ${e.message}</p>`;
  }
}

function renderDestinations(dests) {
  const grid = document.getElementById("destinations-grid");
  if (!grid) return;
  let filtered = dests;
  if (currentCategoryFilter !== "all") {
    filtered = dests.filter((d) =>
      d.category.toLowerCase().includes(currentCategoryFilter) ||
      d.state_region.toLowerCase().includes(currentCategoryFilter)
    );
  }
  if (!filtered || filtered.length === 0) {
    grid.innerHTML = "<p class='text-muted'>No destinations match this filter. Use the live search to fetch any city!</p>";
    return;
  }
  grid.innerHTML = filtered.map((d) => {
    const foodList = Array.isArray(d.food_cuisine) ? d.food_cuisine.slice(0, 2).join(", ") : "Local delicacies";
    const attractions = Array.isArray(d.attractions) ? d.attractions.slice(0, 2).join(", ") : "Sightseeing locations";
    return `
      <div class="dest-card" onclick="openDestinationModal('${d.name.replace(/'/g, "\\'")}')">
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
            <span style="color: var(--primary); font-weight: 600;">View Details ➔</span>
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
  const searchInput = document.getElementById("live-search-input");
  if (btnFetch && searchInput) {
    btnFetch.addEventListener("click", async () => {
      const place = searchInput.value.trim();
      if (!place) return alert("Please enter a destination name (e.g. Varkala, Kozhikode, Goa)");
      btnFetch.textContent = "Fetching Destination 🌐...";
      try {
        const res = await apiFetch("/api/tourism/fetch-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place_name: place }),
        });
        if (res.ok) {
          const dest = await safeResponseJson(res);
          alert(`✅ Destination details loaded for ${dest.name}!`);
          loadDestinations();
          openDestinationModal(dest.name);
        } else {
          alert("Could not fetch destination information.");
        }
      } catch (e) {
        alert(`API Fetch result: ${e.message}`);
      } finally {
        btnFetch.textContent = "Fetch Live 🌐";
      }
    });
  }
}

window.openDestinationModal = async (name) => {
  const modal = document.getElementById("dest-modal");
  const content = document.getElementById("modal-content");
  if (!modal || !content) return;
  modal.classList.remove("hidden");
  content.innerHTML = "<p class='text-muted'>Loading destination package & weather...</p>";

  try {
    const res = await apiFetch(`/api/tourism/destination/${encodeURIComponent(name)}`);
    const dest = await safeResponseJson(res);
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
            ${foods.map((f) => `<li>${f}</li>`).join("")}
          </ul>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #60a5fa; margin-bottom: 6px;">🏛️ Top Sightseeing & Heritage</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${attractions.map((a) => `<li>${a}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #34d399; margin-bottom: 6px;">🏨 Hotels & Stays</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${hotels.map((h) => `<li><strong>${h.name}</strong> (${h.price_range || "N/A"})</li>`).join("")}
          </ul>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <h4 style="color: #f472b6; margin-bottom: 6px;">🎯 Activities & Experiences</h4>
          <ul style="font-size: 13px; padding-left: 18px; color: #e5e7eb;">
            ${activities.map((ac) => `<li>${ac}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--primary-glow); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div>🌦️ <strong>Weather & Climate:</strong> ${dest.weather_summary}</div>
          <div style="font-size: 12px; color: #9ca3af;">Best Season: ${dest.best_season} • Coordinates: ${(dest.latitude || 10).toFixed(4)}, ${(dest.longitude || 76.5).toFixed(4)}</div>
        </div>
        <span style="font-size: 16px; font-weight: 700; color: #34d399;">₹${dest.approx_cost_per_day}/day</span>
      </div>
    `;
  } catch (e) {
    content.innerHTML = `<p class='text-muted'>Failed to load destination details: ${e.message}</p>`;
  }
};

const btnCloseModal = document.getElementById("btn-close-modal");
if (btnCloseModal) {
  btnCloseModal.addEventListener("click", () => {
    document.getElementById("dest-modal")?.classList.add("hidden");
  });
}
