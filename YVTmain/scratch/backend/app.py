import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from backend.database import (
    get_connection, init_db, execute_query, hash_password, verify_password,
    create_session, get_user_for_token,
)
from backend.models import (
    AIRouteRequest, AIRouteResponse,
    AIParsedTripRequest, AIParsedTripResponse,
    AIItineraryRequest, AIItineraryResponse,
    DestinationCreate, LiveTourismFetchRequest,
    SQLQueryRequest, SQLQueryResponse,
    StatusResponse, TripCreate, TripResponse, RegisterRequest, LoginRequest
)
from backend.ai_service import (
    plan_route_ai,
    parse_trip_from_text,
    generate_smart_itinerary,
    estimate_route_distance_duration,
)
from backend.tourism_service import (
    get_all_destinations, get_destination_by_name,
    fetch_and_cache_live_destination, reverse_geocode_osm, geocode_place_osm
)
from backend.analytics_service import (
    get_summary_metrics, get_mode_split_metrics,
    get_peak_travel_hours_metrics, get_purpose_split_metrics,
    get_od_matrix_metrics, export_trips_to_csv
)

app = FastAPI(
    title="TripTrail & NATPAC Mobile Travel Survey Backend",
    description="Python Backend for SIH 2025 (Problem 25082) - NATPAC Travel Survey, Real-World Tourism APIs, and AI Engine",
    version="2.0.0"
)

allowed_origins = [origin.strip() for origin in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:8787,http://localhost:5173,capacitor://localhost,http://localhost"
).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/status")
def get_status():
    try:
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as t_cnt FROM trips;")
            trips_count = c.fetchone()["t_cnt"]
            c.execute("SELECT COUNT(*) as d_cnt FROM destinations;")
            dest_count = c.fetchone()["d_cnt"]
            return {
                "connected": True,
                "version": "SQLite 3.x (WAL Enabled, Python Backend)",
                "checkedAt": datetime.now().isoformat(),
                "mode": "python_sqlite",
                "database_url_configured": bool(os.getenv("DATABASE_URL")),
                "trips_count": trips_count,
                "destinations_count": dest_count
            }
    except Exception as e:
        return {"connected": False, "error": str(e), "mode": "demo"}

@app.post("/api/setup")
def setup_database():
    try:
        init_db()
        return {"ready": True, "message": "Database tables and seed records initialized."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def authenticated_user(request: Request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return get_user_for_token(header[7:].strip())

def issue_auth(user: Dict[str, Any]):
    token = create_session(user["id"], (datetime.now(timezone.utc) + timedelta(days=30)).isoformat())
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "theme": user["theme"]}}

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    with get_connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (payload.name.strip(), email, hash_password(payload.password)),
            )
            conn.commit()
        except Exception as exc:
            if "UNIQUE" in str(exc).upper():
                raise HTTPException(status_code=409, detail="An account with this email already exists.")
            raise
        user = dict(conn.execute("SELECT id, name, email, theme FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone())
    return issue_auth(user)

@app.post("/api/auth/login")
def login(payload: LoginRequest):
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (payload.email.strip(),)).fetchone()
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return issue_auth(dict(row))

@app.get("/api/auth/me")
def me(request: Request):
    user = authenticated_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user

@app.patch("/api/auth/theme")
def update_theme(request: Request, theme: str):
    user = authenticated_user(request)
    if not user or theme not in {"light", "dark", "system"}:
        raise HTTPException(status_code=400, detail="Valid theme and authentication required.")
    with get_connection() as conn:
        conn.execute("UPDATE users SET theme = ? WHERE id = ?", (theme, user["id"]))
        conn.commit()
    return {"theme": theme}

@app.post("/api/query")
def run_sql_query(payload: SQLQueryRequest):
    sql = payload.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query required")
    if not sql.upper().startswith(("SELECT", "EXPLAIN", "WITH")) or any(word in sql.upper() for word in ("INSERT ", "UPDATE ", "DELETE ", "DROP ", "ALTER ", "PRAGMA ")):
        raise HTTPException(status_code=403, detail="Only read-only SQL queries are allowed.")
    try:
        rows, row_count = execute_query(sql)
        return {"rows": rows, "rowCount": row_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/trips")
def list_trips(request: Request):
    user = authenticated_user(request)
    with get_connection() as conn:
        c = conn.cursor()
        where = "WHERE user_id = ?" if user else ""
        params = (user["id"],) if user else ()
        c.execute("""
            SELECT id, title, location, start_date, end_date, note, mood,
                   trip_number, origin, destination, departure_time, arrival_time,
                   travel_mode, trip_purpose, passenger_count, fare_cost, distance_km,
                   duration_min, origin_lat, origin_lng, dest_lat, dest_lng,
                   is_auto_detected, is_synced, created_at
            FROM trips
            {where}
            ORDER BY start_date DESC, id DESC;
        """.format(where=where), params)
        rows = [dict(r) for r in c.fetchall()]
        return rows

@app.post("/api/trips", status_code=status.HTTP_201_CREATED)
def create_trip(trip: TripCreate, request: Request):
    user = authenticated_user(request)
    if not trip.title or not trip.location or not trip.start_date or not trip.end_date:
        raise HTTPException(status_code=400, detail="Title, location, and dates are required.")

    payload = trip.model_dump()
    distance_km = payload.get("distance_km")
    duration_min = payload.get("duration_min")
    if not distance_km or not duration_min:
        distance_km, duration_min = estimate_route_distance_duration(
            payload.get("origin") or payload.get("location"),
            payload.get("destination") or payload.get("location"),
            payload.get("travel_mode") or "Bus",
        )
        payload["distance_km"] = float(distance_km)
        payload["duration_min"] = int(duration_min)

    with get_connection() as conn:
        c = conn.cursor()
        payload["user_id"] = user["id"] if user else None
        c.execute("""
            INSERT INTO trips (
                title, location, start_date, end_date, note, mood, trip_number,
                origin, destination, departure_time, arrival_time, travel_mode,
                trip_purpose, passenger_count, fare_cost, distance_km, duration_min,
                origin_lat, origin_lng, dest_lat, dest_lng, is_auto_detected, is_synced, gps_trace_json, user_id
            ) VALUES (
                :title, :location, :start_date, :end_date, :note, :mood, :trip_number,
                :origin, :destination, :departure_time, :arrival_time, :travel_mode,
                :trip_purpose, :passenger_count, :fare_cost, :distance_km, :duration_min,
                :origin_lat, :origin_lng, :dest_lat, :dest_lng, :is_auto_detected, :is_synced, :gps_trace_json, :user_id
            );
        """, payload)
        conn.commit()
        trip_id = c.lastrowid
        c.execute("SELECT * FROM trips WHERE id = ?;", (trip_id,))
        created = dict(c.fetchone())
        return created

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: int, request: Request):
    user = authenticated_user(request)
    with get_connection() as conn:
        c = conn.cursor()
        if user:
            c.execute("DELETE FROM trips WHERE id = ? AND user_id = ?;", (trip_id, user["id"]))
        else:
            c.execute("DELETE FROM trips WHERE id = ? AND user_id IS NULL;", (trip_id,))
        conn.commit()
        if c.rowcount == 0:
            raise HTTPException(status_code=404, detail="Trip not found")
        return {"success": True, "deleted_id": trip_id}

@app.post("/api/ai/route")
async def ai_route(payload: AIRouteRequest):
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Tell me where you want to go.")
    try:
        result = await plan_route_ai(prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/parse-trip")
async def ai_parse_trip(payload: AIParsedTripRequest):
    try:
        parsed = await parse_trip_from_text(payload.text)
        return parsed
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/ai/itinerary")
async def ai_itinerary(payload: AIItineraryRequest):
    try:
        itinerary = await generate_smart_itinerary(
            dest_name=payload.destination,
            days=payload.days or 3,
            budget=payload.budget or "moderate",
            style=payload.travel_style or "balanced"
        )
        return itinerary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tourism/destinations")
def list_destinations(region: Optional[str] = None, category: Optional[str] = None):
    all_dests = get_all_destinations()
    if region:
        all_dests = [d for d in all_dests if region.lower() in d.get("state_region", "").lower()]
    if category:
        all_dests = [d for d in all_dests if category.lower() in d.get("category", "").lower()]
    return all_dests

@app.get("/api/tourism/destination/{name}")
async def get_destination_details(name: str):
    dest = get_destination_by_name(name)
    if not dest:
        dest = await fetch_and_cache_live_destination(name)
    return dest

@app.post("/api/tourism/fetch-live")
async def fetch_live_tourism(payload: LiveTourismFetchRequest):
    if not payload.place_name.strip():
        raise HTTPException(status_code=400, detail="Place name is required.")
    try:
        dest = await fetch_and_cache_live_destination(payload.place_name.strip())
        return dest
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tourism API fetch failed: {e}")

@app.post("/api/geocode/reverse")
async def reverse_geocode_endpoint(req: Request):
    data = await req.json()
    lat = float(data.get("lat", 0.0))
    lng = float(data.get("lng", 0.0))
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Latitude and longitude required.")
    res = await reverse_geocode_osm(lat, lng)
    return res

@app.get("/api/geocode/search")
async def search_place_endpoint(q: str):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query string required.")
    res = await geocode_place_osm(q)
    if not res:
        raise HTTPException(status_code=404, detail="Place not found.")
    return res

@app.get("/api/analytics/summary")
def get_summary():
    return get_summary_metrics()

@app.get("/api/analytics/mode-split")
def get_mode_split():
    return get_mode_split_metrics()

@app.get("/api/analytics/peak-hours")
def get_peak_hours():
    return get_peak_travel_hours_metrics()

@app.get("/api/analytics/purpose-split")
def get_purpose_split():
    return get_purpose_split_metrics()

@app.get("/api/analytics/od-matrix")
def get_od_matrix():
    return get_od_matrix_metrics()

@app.get("/api/analytics/export/csv")
def export_csv():
    csv_data = export_trips_to_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=natpac_travel_survey_data.csv"}
    )

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
FRONTEND_RAW = ROOT_DIR / "frontend"

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
elif FRONTEND_RAW.exists():
    if (FRONTEND_RAW / "src").exists():
        app.mount("/src", StaticFiles(directory=str(FRONTEND_RAW / "src")), name="src")
    if (FRONTEND_RAW / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_RAW / "assets")), name="assets")
    
    @app.get("/manifest.webmanifest")
    def get_manifest():
        p = FRONTEND_RAW / "manifest.webmanifest"
        if p.exists():
            return FileResponse(str(p), media_type="application/manifest+json")
        return FileResponse(str(FRONTEND_RAW / "manifest.json"), media_type="application/manifest+json")

    @app.get("/manifest.json")
    def get_manifest_json():
        return FileResponse(str(FRONTEND_RAW / "manifest.json"), media_type="application/manifest+json")

    @app.get("/sw.js")
    def get_sw():
        return FileResponse(str(FRONTEND_RAW / "sw.js"), media_type="application/javascript")

    @app.get("/")
    def get_index():
        return FileResponse(str(FRONTEND_RAW / "index.html"), media_type="text/html")
