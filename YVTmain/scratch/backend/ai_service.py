import os
import re
import json
import math
import urllib.parse
import httpx
from typing import Dict, List, Tuple, Any

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

KNOWN_COORDINATES: Dict[str, Tuple[float, float]] = {
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "kochi": (9.9312, 76.2673),
    "cochin": (9.9312, 76.2673),
    "ernakulam": (9.9816, 76.2999),
    "alappuzha": (9.4981, 76.3388),
    "alleppey": (9.4981, 76.3388),
    "munnar": (10.0889, 77.0595),
    "wayanad": (11.6854, 76.1320),
    "kozhikode": (11.2588, 75.7804),
    "calicut": (11.2588, 75.7804),
    "kollam": (8.8932, 76.6141),
    "thrissur": (10.5276, 76.2144),
    "palakkad": (10.7867, 76.6548),
    "kannur": (11.8745, 75.3704),
    "kasaragod": (12.4996, 74.9869),
    "varkala": (8.7379, 76.7163),
    "kovalam": (8.4004, 76.9787),
    "thekkady": (9.6031, 77.1615),
    "kumarakom": (9.6175, 76.4301),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.2958, 76.6394),
    "mysore": (12.2958, 76.6394),
    "coorg": (12.3375, 75.8069),
    "madikeri": (12.4244, 75.7382),
    "ooty": (11.4102, 76.6950),
    "kodaikanal": (10.2381, 77.4892),
    "goa": (15.2993, 74.1240),
    "chennai": (13.0827, 80.2707),
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "jaipur": (26.9124, 75.7873)
}

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def estimate_trip_metrics(stops: List[str]) -> Tuple[str, str]:
    if len(stops) < 2:
        return "0 km", "0 min"
    total_km = 0.0
    for i in range(len(stops) - 1):
        s1 = stops[i].strip().lower().split(",")[0].strip()
        s2 = stops[i+1].strip().lower().split(",")[0].strip()
        c1 = KNOWN_COORDINATES.get(s1)
        c2 = KNOWN_COORDINATES.get(s2)
        if c1 and c2:
            straight = haversine_distance(c1, c2)
            road_dist = straight * 1.32
            total_km += road_dist
        else:
            total_km += 75.0

    hours = total_km / 45.0
    total_min = int(hours * 60)
    h = total_min // 60
    m = total_min % 60
    dist_str = f"{int(round(total_km))} km"
    if h > 0:
        dur_str = f"{h} hr {m} min"
    else:
        dur_str = f"{m} min"
    return dist_str, dur_str


def estimate_route_distance_duration(origin: str, destination: str, mode: str = "Bus") -> Tuple[float, int]:
    origin_key = (origin or "").strip().lower().split(",")[0].strip()
    destination_key = (destination or "").strip().lower().split(",")[0].strip()

    if not origin_key or not destination_key:
        return 22.5, 55

    c1 = KNOWN_COORDINATES.get(origin_key)
    c2 = KNOWN_COORDINATES.get(destination_key)
    if c1 and c2:
        direct_km = haversine_distance(c1, c2)
    else:
        direct_km = 42.0

    speed_map = {
        "Bus": 32,
        "Train": 52,
        "Metro": 40,
        "Auto": 22,
        "Car": 46,
        "Two-Wheeler": 35,
        "Walking": 4,
        "Bicycle": 12,
        "Ferry": 18,
        "Flight": 260,
    }
    speed_kmh = speed_map.get(mode, 34)
    distance_km = max(1.0, round(direct_km * 1.28, 1))
    duration_min = max(15, int(round((distance_km / speed_kmh) * 60)))
    return distance_km, duration_min

def extract_stops_rule_based(prompt: str) -> List[str]:
    clean = re.sub(r"^(plan a trip|route|travel|drive|itinerary from|from)\s+", "", prompt, flags=re.IGNORECASE).strip()
    stops = re.split(r"\s*(?:->|→|,|\band then\b|\bthen\b|\bto\b|\bvia\b)\s*", clean, flags=re.IGNORECASE)
    stops = [s.strip().title() for s in stops if s.strip() and len(s.strip()) > 1]
    filtered = []
    for s in stops:
        if s.lower() not in ["a", "the", "my", "trip", "route", "destination", "and", "with", "by"]:
            filtered.append(s)
    return filtered[:8]

async def plan_route_ai(prompt: str) -> Dict[str, Any]:
    prompt = prompt.strip()
    if not prompt:
        raise ValueError("Tell me where you want to go.")

    stops = extract_stops_rule_based(prompt)

    if OPENAI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "model": OPENAI_MODEL,
                        "response_format": {"type": "json_object"},
                        "messages": [
                            {"role": "system", "content": "Extract a driving itinerary from the user request. Return JSON only in the shape {\"stops\":[\"place 1\",\"place 2\"]}. Keep at most 8 stops."},
                            {"role": "user", "content": prompt}
                        ]
                    }
                )
                if res.status_code == 200:
                    ai_data = res.json()
                    parsed = json.loads(ai_data["choices"][0]["message"]["content"])
                    if "stops" in parsed and isinstance(parsed["stops"], list) and len(parsed["stops"]) >= 2:
                        stops = [str(s).strip().title() for s in parsed["stops"][:8]]
        except Exception as e:
            print(f"AI route planning fallback: {e}")

    elif GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
                sys_inst = "Extract driving itinerary stops from prompt. Respond ONLY with valid JSON: {\"stops\": [\"Place1\", \"Place2\"]}. Max 8 stops."
                payload = {"contents": [{"parts": [{"text": f"{sys_inst}\n\nUser prompt: {prompt}"}]}]}
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                    if match:
                        parsed = json.loads(match.group(0))
                        if "stops" in parsed and isinstance(parsed["stops"], list) and len(parsed["stops"]) >= 2:
                            stops = [str(s).strip().title() for s in parsed["stops"][:8]]
        except Exception as e:
            print(f"Gemini route planning fallback: {e}")

    if len(stops) < 2:
        stops = ["Thiruvananthapuram", "Kochi", "Munnar"]

    origin_param = urllib.parse.quote(stops[0])
    dest_param = urllib.parse.quote(stops[-1])
    waypts = "|".join([urllib.parse.quote(s) for s in stops[1:-1]])
    maps_url = f"https://www.google.com/maps/dir/?api=1&origin={origin_param}&destination={dest_param}&waypoints={waypts}"

    if not GOOGLE_MAPS_API_KEY:
        dist_est, dur_est = estimate_trip_metrics(stops)
        return {
            "mode": "local_estimate",
            "stops": stops,
            "distance": dist_est,
            "duration": dur_est,
            "mapsUrl": maps_url,
            "message": "Using local route estimates; add GOOGLE_MAPS_API_KEY for live routing."
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            routes_res = await client.post(
                "https://routes.googleapis.com/directions/v2:computeRoutes",
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
                },
                json={
                    "origin": {"address": stops[0]},
                    "destination": {"address": stops[-1]},
                    "intermediates": [{"address": s} for s in stops[1:-1]],
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE"
                }
            )
            if routes_res.status_code == 200:
                data = routes_res.json()
                route = data.get("routes", [{}])[0]
                dist_m = route.get("distanceMeters", 0)
                dur_s = route.get("duration", "0s")
                return {
                    "mode": "google",
                    "stops": stops,
                    "distance": f"{round(dist_m / 1000)} km",
                    "duration": dur_s.replace("s", " sec"),
                    "polyline": route.get("polyline", {}).get("encodedPolyline"),
                    "mapsUrl": maps_url
                }
    except Exception as e:
        print(f"Google Routes API error: {e}")

    dist_est, dur_est = estimate_trip_metrics(stops)
    return {
        "mode": "local_estimate",
        "stops": stops,
        "distance": dist_est,
        "duration": dur_est,
        "mapsUrl": maps_url
    }

async def parse_trip_from_text(user_text: str) -> Dict[str, Any]:
    text = user_text.strip()
    mode = "Bus"
    text_lower = text.lower()
    if any(k in text_lower for k in ["metro", "kochi metro"]):
        mode = "Metro"
    elif any(k in text_lower for k in ["ksrtc", "bus", "volvo", "minibus"]):
        mode = "Bus"
    elif any(k in text_lower for k in ["train", "rail", "express", "vande bharat"]):
        mode = "Train"
    elif any(k in text_lower for k in ["auto", "autorickshaw", "tuk tuk", "rickshaw"]):
        mode = "Auto"
    elif any(k in text_lower for k in ["car", "taxi", "uber", "ola", "cab", "drive"]):
        mode = "Car"
    elif any(k in text_lower for k in ["bike", "motorcycle", "scooter", "activa"]):
        mode = "Two-Wheeler"
    elif any(k in text_lower for k in ["walk", "walking", "on foot"]):
        mode = "Walking"
    elif any(k in text_lower for k in ["cycle", "bicycle"]):
        mode = "Bicycle"
    elif any(k in text_lower for k in ["boat", "ferry", "water metro", "shikara"]):
        mode = "Ferry"
    elif any(k in text_lower for k in ["flight", "plane", "airplane"]):
        mode = "Flight"

    purpose = "Work"
    if any(k in text_lower for k in ["office", "work", "client", "meeting", "job", "duty", "natpac"]):
        purpose = "Work"
    elif any(k in text_lower for k in ["college", "school", "university", "class", "tuition", "exam"]):
        purpose = "Education"
    elif any(k in text_lower for k in ["tour", "vacation", "holiday", "sightseeing", "temple", "beach", "resort", "waterfall"]):
        purpose = "Tourism"
    elif any(k in text_lower for k in ["shop", "market", "mall", "grocery", "buy"]):
        purpose = "Shopping"
    elif any(k in text_lower for k in ["hospital", "doctor", "clinic", "medical", "health"]):
        purpose = "Healthcare"
    elif any(k in text_lower for k in ["home", "house", "return", "going back"]):
        purpose = "Return Home"

    fare = 0.0
    fare_match = re.search(r"(?:rs\.?|inr|₹|cost|paid|fare|spent)\s*([0-9]+(?:\.[0-9]+)?)", text, re.IGNORECASE)
    if not fare_match:
        fare_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*(?:rs|rupees|bucks|inr)", text, re.IGNORECASE)
    if fare_match:
        try:
            fare = float(fare_match.group(1))
        except ValueError:
            fare = 0.0

    origin = ""
    destination = ""
    from_to_match = re.search(r"from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s0-9,]+?)(?:\s+at|\s+for|\s+cost|\s+by|\s+via|\s+with|\.|,|$)", text, re.IGNORECASE)
    if from_to_match:
        origin = from_to_match.group(1).strip().title()
        destination = from_to_match.group(2).strip().title()
    else:
        arrow_match = re.search(r"([a-zA-Z\s]+?)\s*(?:->|→|to)\s*([a-zA-Z\s]+)", text)
        if arrow_match:
            origin = arrow_match.group(1).strip().title()
            destination = arrow_match.group(2).strip().title()
        else:
            origin = "Origin Point"
            destination = "Destination Point"

    dep_time = "08:30"
    time_match = re.search(r"(?:at|time|around)\s*([0-1]?[0-9]|2[0-3])(?::([0-5][0-9]))?\s*(am|pm)?", text, re.IGNORECASE)
    if time_match:
        hour = int(time_match.group(1))
        minute = int(time_match.group(2) or 0)
        ampm = (time_match.group(3) or "").lower()
        if ampm == "pm" and hour < 12:
            hour += 12
        elif ampm == "am" and hour == 12:
            hour = 0
        dep_time = f"{hour:02d}:{minute:02d}"

    arr_h = int(dep_time.split(":")[0])
    arr_m = int(dep_time.split(":")[1]) + 45
    if arr_m >= 60:
        arr_h = (arr_h + 1) % 24
        arr_m %= 60
    arr_time = f"{arr_h:02d}:{arr_m:02d}"

    title = f"{mode} Trip: {origin} to {destination}"
    location = f"{origin}, {destination}" if destination else origin

    return {
        "success": True,
        "title": title,
        "origin": origin,
        "destination": destination,
        "location": location,
        "travel_mode": mode,
        "departure_time": dep_time,
        "arrival_time": arr_time,
        "trip_purpose": purpose,
        "fare_cost": fare,
        "passenger_count": 1,
        "note": f"Auto-extracted from prompt: \"{text}\"",
        "mood": "sunny"
    }

async def generate_smart_itinerary(dest_name: str, days: int = 3, budget: str = "moderate", style: str = "balanced") -> Dict[str, Any]:
    dest_clean = dest_name.strip().title()
    daily_plans = []
    activities_pool = [
        ("Heritage & Sightseeing", "Morning visit to historic landmark, royal palace or cultural museum.", "Local ethnic restaurant sampling traditional thali and regional delicacies.", "Sunset viewpoint visit, scenic lake walk or waterfront promenade.", ["Kerala Sadya", "Appam with Stew", "Fresh Tropical Juices"], "Kochi Metro & Electric Ferry / Auto"),
        ("Nature, Backwaters & Eco-trails", "Early morning eco-walk through lush tea estates, backwater canals or botanical gardens.", "Traditional houseboat lunch or river-side fish fry tasting.", "Village craft tour, spice plantation walk or wildlife watch.", ["Karimeen Pollichathu", "Kuttanadan Duck Roast", "Tender Coconut"], "KSRTC Bus & Shikara Boat"),
        ("Adventures & Culture", "Trekking to scenic hilltop, viewpoint or waterfall cascade.", "Authentic spice market exploration and street food tasting.", "Evening classical Kathakali dance or martial arts show (Kalaripayattu).", ["Malabar Biryani", "Pazham Pori", "Cardamom Filter Coffee"], "Public Transport & Walking Tour"),
        ("Relaxation & Coastal Breezes", "Beach morning relaxation, yoga session and coastal cliff stroll.", "Seafood shack dining with catch-of-the-day fish.", "Lighthouse panoramic views and souvenir shopping for handicrafts.", ["Fish Curry Meals", "Tapioca with Chilli dip", "Local Banana Chips"], "Cycle Rental & Auto-rickshaw")
    ]
    for d in range(1, min(days + 1, 8)):
        pool_idx = (d - 1) % len(activities_pool)
        theme, morn, aft, eve, foods, trans = activities_pool[pool_idx]
        daily_plans.append({
            "day": d,
            "theme": f"Day {d}: {theme} in {dest_clean}",
            "morning": f"{morn} (9:00 AM - 1:00 PM)",
            "afternoon": f"{aft} (1:00 PM - 5:00 PM)",
            "evening": f"{eve} (5:00 PM - 8:30 PM)",
            "food_recommendations": foods,
            "transport_mode": trans
        })
    budget_estimate = f"₹{days * 2800:,} - ₹{days * 4500:,} (Estimated for {days} days)"
    if budget == "luxury":
        budget_estimate = f"₹{days * 8500:,} - ₹{days * 16000:,} (Luxury 5-Star Experience)"
    elif budget == "budget":
        budget_estimate = f"₹{days * 1200:,} - ₹{days * 2200:,} (Backpacker / Budget)"
    return {
        "destination": dest_clean,
        "days": days,
        "summary": f"Custom {days}-day travel itinerary for {dest_clean} curated with local Kerala cuisine, sightseeing, eco-activities, and sustainable transport modes.",
        "daily_plan": daily_plans,
        "estimated_budget": budget_estimate,
        "best_time": "October to March (Pleasant Weather & Cultural Festivities)"
    }
