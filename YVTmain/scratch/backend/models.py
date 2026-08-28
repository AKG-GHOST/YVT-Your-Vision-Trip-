from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class TripBase(BaseModel):
    title: str
    location: str
    start_date: str
    end_date: str
    note: Optional[str] = ""
    mood: Optional[str] = "sunny"
    trip_number: Optional[int] = 1
    origin: Optional[str] = ""
    destination: Optional[str] = ""
    departure_time: Optional[str] = ""
    arrival_time: Optional[str] = ""
    travel_mode: Optional[str] = "Bus"
    trip_purpose: Optional[str] = "Tourism"
    passenger_count: Optional[int] = 1
    fare_cost: Optional[float] = 0.0
    distance_km: Optional[float] = 0.0
    duration_min: Optional[int] = 0
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    is_auto_detected: Optional[int] = 0
    is_synced: Optional[int] = 1
    gps_trace_json: Optional[str] = "[]"

class TripCreate(TripBase):
    pass

class TripResponse(TripBase):
    id: int
    created_at: Optional[str] = None

class AIRouteRequest(BaseModel):
    prompt: str

class AIRouteResponse(BaseModel):
    mode: str = "local_estimate"
    stops: List[str]
    distance: str
    duration: str
    mapsUrl: str
    polyline: Optional[str] = None
    message: Optional[str] = None

class AIParsedTripRequest(BaseModel):
    text: str

class AIParsedTripResponse(BaseModel):
    success: bool
    title: str
    origin: str
    destination: str
    location: str
    travel_mode: str
    departure_time: str
    arrival_time: str
    trip_purpose: str
    fare_cost: float
    passenger_count: int
    note: str
    mood: str

class AIItineraryRequest(BaseModel):
    destination: str
    days: Optional[int] = 3
    budget: Optional[str] = "moderate"
    travel_style: Optional[str] = "balanced"

class AIItineraryDay(BaseModel):
    day: int
    theme: str
    morning: str
    afternoon: str
    evening: str
    food_recommendations: List[str]
    transport_mode: str

class AIItineraryResponse(BaseModel):
    destination: str
    days: int
    summary: str
    daily_plan: List[AIItineraryDay]
    estimated_budget: str
    best_time: str

class DestinationCreate(BaseModel):
    name: str
    state_region: Optional[str] = "Kerala"
    category: Optional[str] = "Tourism"
    description: Optional[str] = ""
    latitude: Optional[float] = 0.0
    longitude: Optional[float] = 0.0
    food_cuisine: Optional[List[str]] = []
    attractions: Optional[List[str]] = []
    hotels: Optional[List[Dict[str, Any]]] = []
    activities: Optional[List[str]] = []
    ratings: Optional[float] = 4.5
    approx_cost_per_day: Optional[float] = 2000.0
    best_season: Optional[str] = "Oct - Mar"
    weather_summary: Optional[str] = "Pleasant"
    image_url: Optional[str] = ""
    source: Optional[str] = "local_cache"

class LiveTourismFetchRequest(BaseModel):
    place_name: str
    refresh: Optional[bool] = False

class SQLQueryRequest(BaseModel):
    sql: str

class SQLQueryResponse(BaseModel):
    rows: List[Dict[str, Any]]
    rowCount: int

class StatusResponse(BaseModel):
    connected: bool
    version: Optional[str] = None
    checkedAt: Optional[str] = None
    mode: Optional[str] = "python_sqlite"
    database_url_configured: bool = False
    trips_count: int = 0
    destinations_count: int = 0

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    theme: str = "system"

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
