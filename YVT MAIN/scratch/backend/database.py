import os
import json
import sqlite3
import hashlib
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_PATH = DB_DIR / "triptrail.db"
DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    conn = sqlite3.connect(str(SQLITE_PATH), timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                location TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                note TEXT DEFAULT "",
                mood TEXT DEFAULT "sunny",
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trip_number INTEGER DEFAULT 1,
                origin TEXT DEFAULT "",
                destination TEXT DEFAULT "",
                departure_time TEXT DEFAULT "",
                arrival_time TEXT DEFAULT "",
                travel_mode TEXT DEFAULT "Bus",
                trip_purpose TEXT DEFAULT "Tourism",
                passenger_count INTEGER DEFAULT 1,
                fare_cost REAL DEFAULT 0.0,
                distance_km REAL DEFAULT 0.0,
                duration_min INTEGER DEFAULT 0,
                origin_lat REAL,
                origin_lng REAL,
                dest_lat REAL,
                dest_lng REAL,
                is_auto_detected INTEGER DEFAULT 0,
                is_synced INTEGER DEFAULT 1,
                gps_trace_json TEXT DEFAULT "[]"
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                theme TEXT NOT NULL DEFAULT "system",
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        try:
            cursor.execute("ALTER TABLE trips ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;")
        except sqlite3.OperationalError:
            pass
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS destinations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                state_region TEXT DEFAULT "Kerala",
                category TEXT DEFAULT "Tourism",
                description TEXT DEFAULT "",
                latitude REAL DEFAULT 0.0,
                longitude REAL DEFAULT 0.0,
                food_cuisine TEXT DEFAULT "[]",
                attractions TEXT DEFAULT "[]",
                hotels TEXT DEFAULT "[]",
                activities TEXT DEFAULT "[]",
                ratings REAL DEFAULT 4.5,
                approx_cost_per_day REAL DEFAULT 2000.0,
                best_season TEXT DEFAULT "Oct - Mar",
                weather_summary TEXT DEFAULT "Pleasant",
                image_url TEXT DEFAULT "",
                source TEXT DEFAULT "local_cache",
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS natpac_surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT "anonymous",
                age_group TEXT DEFAULT "18-35",
                gender TEXT DEFAULT "Unspecified",
                occupation TEXT DEFAULT "Working Professional",
                monthly_travel_budget REAL DEFAULT 3000.0,
                frequent_mode TEXT DEFAULT "Bus / Public Transport",
                feedback TEXT DEFAULT "",
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tourism_cache (
                cache_key TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_mode ON trips(travel_mode);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_destinations_region ON destinations(state_region);")
        conn.commit()
        seed_destinations_if_empty(cursor, conn)
        seed_sample_trips_if_empty(cursor, conn)

def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"

def verify_password(password: str, encoded: str) -> bool:
    try:
        salt_hex, digest_hex = encoded.split("$", 1)
        expected = hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=16384, r=8, p=1)
        return secrets.compare_digest(expected.hex(), digest_hex)
    except (ValueError, TypeError):
        return False

def create_session(user_id: int, expires_at: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at),
        )
        conn.commit()
    return token

def get_user_for_token(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_connection() as conn:
        row = conn.execute(
            """SELECT u.id, u.name, u.email, u.theme FROM users u
               JOIN sessions s ON s.user_id = u.id
               WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP""",
            (token_hash,),
        ).fetchone()
        return dict(row) if row else None

def seed_destinations_if_empty(cursor, conn):
    cursor.execute("SELECT COUNT(*) as cnt FROM destinations;")
    if cursor.fetchone()["cnt"] > 0:
        return
    sample_destinations = [
        {
            "name": "Munnar",
            "state_region": "Kerala (Idukki)",
            "category": "Hill Station & Tea Plantations",
            "description": "Munnar is a picturesque hill station in the Western Ghats known for lush tea estates, misty valleys, waterfalls, and rare flora like Neelakurinji.",
            "latitude": 10.0889,
            "longitude": 77.0595,
            "food_cuisine": json.dumps(["Kerala Parotta with Veg/Chicken Curry", "Puttu and Kadala Curry", "Fresh Cardamom & Ginger Tea", "Spiced Hot Banana Fritters (Pazham Pori)", "Local Roasted Cashews & Homemade Chocolates"]),
            "attractions": json.dumps(["Eravikulam National Park (Nilgiri Tahr sanctuary)", "Mattupetty Dam & Eco Point", "Tea Museum & Tata Tea Estate", "Top Station Panorama Viewpoint", "Attukad & Lakkam Waterfalls"]),
            "hotels": json.dumps([{"name": "Tea County Munnar (KTDC)", "type": "Heritage / Mid-Range", "price_range": "₹4,500 - ₹7,000/night", "rating": 4.6}, {"name": "Blanket Hotel & Spa", "type": "Luxury Resort", "price_range": "₹9,000 - ₹15,000/night", "rating": 4.8}, {"name": "Munnar Green Homestay", "type": "Budget Homestay", "price_range": "₹1,500 - ₹2,500/night", "rating": 4.4}]),
            "activities": json.dumps(["Tea Plantation Trekking & Estate Tour", "Nilgiri Tahr Wildlife Safari", "Boating at Mattupetty Reservoir", "Campfire & Stargazing at Top Station", "Spice Plantation Walk & Ayurvedic Massage"]),
            "ratings": 4.8,
            "approx_cost_per_day": 3200.0,
            "best_season": "September to March",
            "weather_summary": "Misty, Cool & Pleasant (15°C - 24°C)",
            "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Kochi (Cochin)",
            "state_region": "Kerala (Ernakulam)",
            "category": "Coastal & Heritage Port",
            "description": "The Queen of the Arabian Sea, blending Portuguese, Dutch, British colonial history with Chinese fishing nets, vibrant spice markets, and modern Kochi Metro.",
            "latitude": 9.9312,
            "longitude": 76.2673,
            "food_cuisine": json.dumps(["Karimeen Pollichathu (Pearl Spot Fish in Banana Leaf)", "Kerala Fish Curry Meals", "Appam with Stew (Chicken/Veg)", "Mattancherry Biryani & Kayees Delicacy", "Kuluki Sarbath & Fresh Tender Coconut"]),
            "attractions": json.dumps(["Fort Kochi Chinese Fishing Nets", "Mattancherry Palace (Dutch Palace)", "Jewish Synagogue & Jew Town", "St. Francis Church (Vasco da Gama memorial)", "Marine Drive & Kochi Water Metro Ferry"]),
            "hotels": json.dumps([{"name": "Brunton Boatyard - CGH Earth", "type": "Luxury Heritage", "price_range": "₹14,000 - ₹22,000/night", "rating": 4.9}, {"name": "Old Harbour Hotel", "type": "Boutique Hotel", "price_range": "₹7,500 - ₹12,000/night", "rating": 4.7}, {"name": "Zostel Kochi (Fort Kochi)", "type": "Backpacker Hostel", "price_range": "₹800 - ₹2,000/night", "rating": 4.5}]),
            "activities": json.dumps(["Kathakali Dance Performance at Kerala Kathakali Centre", "Kochi Water Metro Ride across islands", "Heritage Walking Tour in Fort Kochi", "Spice Market Shopping at Jew Town", "Sunset Cruise on Cochin Harbour"]),
            "ratings": 4.7,
            "approx_cost_per_day": 2800.0,
            "best_season": "October to April",
            "weather_summary": "Warm & Coastal Breeze (25°C - 31°C)",
            "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Alappuzha (Alleppey)",
            "state_region": "Kerala (Alappuzha)",
            "category": "Backwaters & Coastal",
            "description": "Venice of the East, world-famous for its tranquil backwaters, traditional Kettuvallam houseboats, coir crafts, paddy fields below sea level (Kuttanad), and beach pier.",
            "latitude": 9.4981,
            "longitude": 76.3388,
            "food_cuisine": json.dumps(["Kuttanadan Duck Roast (Tharavu Roast)", "Fresh Backwater Prawn Roast (Konchu)", "Karimeen Fry with Tapioca (Kappa & Meen Curry)", "Traditional Kerala Sadya on Plantain Leaf", "Toddy Shop Delicacies & Fresh Clam Fry"]),
            "attractions": json.dumps(["Punnamada Lake (Nehru Trophy Boat Race venue)", "Vembanad Lake Backwater Network", "Alappuzha Beach & Historic Lighthouse", "Kuttanad Below-Sea-Level Paddy Fields", "Marari Serene White Sand Beach"]),
            "hotels": json.dumps([{"name": "Alleppey Premium Houseboats", "type": "Luxury Water Stay", "price_range": "₹12,000 - ₹25,000/night", "rating": 4.9}, {"name": "Uday Backwater Resort", "type": "Premium Resort", "price_range": "₹6,000 - ₹9,500/night", "rating": 4.6}, {"name": "Riverside Heritage Homestay", "type": "Backwater Homestay", "price_range": "₹1,800 - ₹3,200/night", "rating": 4.5}]),
            "activities": json.dumps(["Overnight Houseboat Cruise with Chef on Board", "Shikara Boat & Kayaking through village canals", "Witnessing Vallam Kali (Snake Boat Race)", "Coir Making & Village Life Experience Tour", "Marari Beach Yoga & Sunset Relaxation"]),
            "ratings": 4.9,
            "approx_cost_per_day": 3800.0,
            "best_season": "November to March",
            "weather_summary": "Tropical & Serene (24°C - 32°C)",
            "image_url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Wayanad",
            "state_region": "Kerala (Wayanad)",
            "category": "Hill Station, Caves & Wildlife",
            "description": "Wayanad is renowned for its prehistoric Edakkal Caves, mist-clad Chembra Peak with heart-shaped lake, Banasura Sagar earthen dam, and spice-rich forests.",
            "latitude": 11.6854,
            "longitude": 76.1320,
            "food_cuisine": json.dumps(["Wayanadan Bamboo Biryani", "Malabar Pathiri with Mutton Stew", "Unniyappam & Neyyappam", "Forest Wild Honey & Arrowroot Payasam", "Steamed Tapioca with Kanthari Chilli Dip"]),
            "attractions": json.dumps(["Edakkal Caves (Neolithic rock carvings)", "Banasura Sagar Dam (Largest earthen dam in India)", "Chembra Peak & Heart Lake (Hridaya Saras)", "Muthanga Wildlife Sanctuary", "Soochipara & Meenmutty Waterfalls"]),
            "hotels": json.dumps([{"name": "Vythiri Resort (Treehouse Luxury)", "type": "Eco Luxury Resort", "price_range": "₹10,000 - ₹18,000/night", "rating": 4.8}, {"name": "Sterling Wayanad", "type": "Family Resort", "price_range": "₹5,500 - ₹8,500/night", "rating": 4.5}, {"name": "Coffee County Homestay", "type": "Plantation Homestay", "price_range": "₹2,000 - ₹3,500/night", "rating": 4.6}]),
            "activities": json.dumps(["Trekking to Chembra Peak Heart Lake", "Exploring 5000-year-old Edakkal Petroglyphs", "Speedboating at Banasura Sagar Reservoir", "Jeep Safari in Muthanga Tiger Reserve", "Ziplining across Tea Valleys"]),
            "ratings": 4.7,
            "approx_cost_per_day": 3000.0,
            "best_season": "October to May",
            "weather_summary": "Crisp, Forest Breeze & Cool (17°C - 27°C)",
            "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Thiruvananthapuram (Trivandrum)",
            "state_region": "Kerala (Capital District)",
            "category": "Capital, Heritage & Beaches",
            "description": "Kerala capital city, home to the architectural grandeur of Sree Padmanabhaswamy Temple, Kovalam crescent beaches, NATPAC headquarters, and Napier Museum.",
            "latitude": 8.5241,
            "longitude": 76.9366,
            "food_cuisine": json.dumps(["Boli with Palpayasam (Trivandrum Festive Special)", "Travancore Fish Curry with Red Rice", "Chala (Sardine) Fry & Tapioca", "Rasam Vada & Filter Coffee at Indian Coffee House", "Trivandrum Chicken Fry (Thatte Kada Style)"]),
            "attractions": json.dumps(["Sree Padmanabhaswamy Temple (Dravidian architecture)", "Kovalam Lighthouse & Hawa Beach", "Napier Museum & Kanakakkunnu Palace", "NATPAC Transportation Research Centre", "Varkala Cliff Beach & Janardhana Temple", "Poovar Island Estuary & Golden Sand Beach"]),
            "hotels": json.dumps([{"name": "The Leela Kovalam, A Raviz Hotel", "type": "5-Star Cliffside Resort", "price_range": "₹16,000 - ₹28,000/night", "rating": 4.9}, {"name": "Hycinth Hotels Trivandrum", "type": "Business & Leisure", "price_range": "₹5,000 - ₹8,000/night", "rating": 4.6}, {"name": "Mascot Hotel (KTDC Heritage)", "type": "Heritage Hotel", "price_range": "₹3,500 - ₹6,000/night", "rating": 4.4}]),
            "activities": json.dumps(["Mangrove Forest Boating at Poovar Estuary", "Surfing and Cliff Walks at Varkala Beach", "Visiting Napier Art Gallery & Zoo", "Shopping for Kerala Handloom & Balaramapuram Sarees", "Sunset at Shanghumukham Beach"]),
            "ratings": 4.7,
            "approx_cost_per_day": 2600.0,
            "best_season": "October to March",
            "weather_summary": "Tropical Coastal Breeze (24°C - 32°C)",
            "image_url": "https://images.unsplash.com/photo-1597735881932-d9664c9bbcea?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Bengaluru",
            "state_region": "Karnataka",
            "category": "Silicon City, Gardens & Tech Hub",
            "description": "The vibrant Garden City and Tech Hub of India, known for Cubbon Park, Lalbagh Botanical Gardens, craft breweries, historic Bangalore Palace, and pleasant weather.",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "food_cuisine": json.dumps(["Crispy Benne Masala Dosa (Vidyarthi Bhavan)", "Filter Kaapi with Rava Idli at CTR / MTR", "Bisi Bele Bath with Boondi", "Mangalore Ghee Roast & Akki Roti", "Artisanal Craft Beers & Pub Snacks"]),
            "attractions": json.dumps(["Lalbagh Botanical Garden & Glass House", "Cubbon Park & Vidhana Soudha", "Bangalore Palace (Tudor architecture)", "Bannerghatta National Park & Safari", "Visvesvaraya Industrial & Tech Museum"]),
            "hotels": json.dumps([{"name": "The Oberoi Bengaluru (MG Road)", "type": "Luxury 5-Star", "price_range": "₹12,000 - ₹20,000/night", "rating": 4.8}, {"name": "The Chancery Pavilion", "type": "Upscale City Hotel", "price_range": "₹4,500 - ₹7,500/night", "rating": 4.4}, {"name": "Bloom Boutique | Indiranagar", "type": "Modern Boutique", "price_range": "₹2,800 - ₹4,500/night", "rating": 4.5}]),
            "activities": json.dumps(["Early Morning Walk & Floral Show at Lalbagh", "Microbrewery Hopping in Indiranagar & Koramangala", "Museum Exploration at HAL Aerospace & Science Centre", "Heritage Cycle Tour in Bangalore Old City", "Namma Metro Commute & Brigade Road Shopping"]),
            "ratings": 4.6,
            "approx_cost_per_day": 3500.0,
            "best_season": "Throughout the year (Best: Oct - Feb)",
            "weather_summary": "Pleasant & Moderate (19°C - 28°C)",
            "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Mysuru (Mysore)",
            "state_region": "Karnataka",
            "category": "Royal Heritage & Palaces",
            "description": "The City of Palaces, world-renowned for the magnificent illuminated Mysore Palace, Chamundi Hills, Mysore Pak sweet, Sandalwood heritage, and Dasara celebrations.",
            "latitude": 12.2958,
            "longitude": 76.6394,
            "food_cuisine": json.dumps(["Original Melt-in-Mouth Mysore Pak (Guru Sweets)", "Mysore Masala Dosa with Spicy Red Chutney (Mylari)", "Shavige Bath & Kharabath", "Set Dosa with Sagu", "Maddur Vada"]),
            "attractions": json.dumps(["Mysore Palace (Amba Vilas Palace)", "Chamundeshwari Temple & Nandi Bull", "Brindavan Gardens & Musical Fountain", "St. Philomenas Cathedral", "Sri Chamarajendra Zoological Gardens"]),
            "hotels": json.dumps([{"name": "Lalitha Mahal Palace Hotel", "type": "Royal Heritage Palace", "price_range": "₹7,000 - ₹14,000/night", "rating": 4.6}, {"name": "Radisson Blu Plaza Hotel Mysore", "type": "5-Star Luxury", "price_range": "₹6,000 - ₹10,000/night", "rating": 4.7}, {"name": "Roambay Hostel & Homestay", "type": "Heritage Backpacker", "price_range": "₹900 - ₹2,200/night", "rating": 4.5}]),
            "activities": json.dumps(["Grand Palace Weekend Illumination View", "Climbing 1,000 Steps to Chamundi Hill Temple", "Silk Saree & Sandalwood Oil Shopping", "Ashtanga Yoga Workshop at Gokulam", "Evening Musical Light Show at Brindavan Gardens"]),
            "ratings": 4.8,
            "approx_cost_per_day": 2400.0,
            "best_season": "September to March",
            "weather_summary": "Warm Days, Mild Cool Evenings (20°C - 30°C)",
            "image_url": "https://images.unsplash.com/photo-1600100397608-f010f443b749?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        },
        {
            "name": "Goa",
            "state_region": "Goa",
            "category": "Beaches, Portuguese Architecture & Shacks",
            "description": "Premier coastal destination famed for golden beaches, UNESCO Portuguese churches, seafood shacks, and vibrant culture.",
            "latitude": 15.2993,
            "longitude": 74.1240,
            "food_cuisine": json.dumps(["Goan Fish Curry Rice with Kingfish (Surmai)", "Pork/Chicken Vindaloo & Sorpotel", "Goan Pao with Ross Omelette", "Bebinca Layered Dessert", "Feni & Tender Coconut Drinks"]),
            "attractions": json.dumps(["Basilica of Bom Jesus & Se Cathedral", "Fort Aguada & Chapora Fort", "Palolem & Anjuna Beaches", "Dudhsagar Waterfalls", "Fontainhas Latin Quarter"]),
            "hotels": json.dumps([{"name": "Taj Exotica Resort & Spa", "type": "5-Star Beach Luxury", "price_range": "₹18,000 - ₹35,000/night", "rating": 4.9}, {"name": "Heritage Village Resort", "type": "Boutique Resort", "price_range": "₹7,000 - ₹12,000/night", "rating": 4.6}, {"name": "The Hosteller Goa", "type": "Social Hostel", "price_range": "₹800 - ₹2,500/night", "rating": 4.5}]),
            "activities": json.dumps(["Scuba Diving & Parasailing at Grand Island", "Cruising the Mandovi River with Goan Dance", "Heritage Walk in Fontainhas Panaji", "Dudhsagar Waterfalls Jeep Safari", "Beach Shack Sunset Dining"]),
            "ratings": 4.8,
            "approx_cost_per_day": 3800.0,
            "best_season": "November to February",
            "weather_summary": "Sunny & Coastal Breeze (22°C - 32°C)",
            "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80",
            "source": "local_cache"
        }
    ]
    for dest in sample_destinations:
        cursor.execute("""
            INSERT INTO destinations (
                name, state_region, category, description, latitude, longitude,
                food_cuisine, attractions, hotels, activities, ratings, approx_cost_per_day,
                best_season, weather_summary, image_url, source
            ) VALUES (
                :name, :state_region, :category, :description, :latitude, :longitude,
                :food_cuisine, :attractions, :hotels, :activities, :ratings, :approx_cost_per_day,
                :best_season, :weather_summary, :image_url, :source
            );
        """, dest)
    conn.commit()

def seed_sample_trips_if_empty(cursor, conn):
    cursor.execute("SELECT COUNT(*) as cnt FROM trips;")
    if cursor.fetchone()["cnt"] > 0:
        return
    sample_trips = [
        {
            "title": "KSRTC Morning Commute to NATPAC Office",
            "location": "Thiruvananthapuram, Kerala",
            "start_date": "2026-08-25",
            "end_date": "2026-08-25",
            "note": "Daily office commute captured via NATPAC automated mobile travel survey.",
            "mood": "sunny",
            "trip_number": 1,
            "origin": "Kazhakkoottam, Thiruvananthapuram",
            "destination": "Pattom (NATPAC HQ), Thiruvananthapuram",
            "departure_time": "08:30",
            "arrival_time": "09:15",
            "travel_mode": "Bus",
            "trip_purpose": "Work",
            "passenger_count": 1,
            "fare_cost": 28.0,
            "distance_km": 14.2,
            "duration_min": 45,
            "origin_lat": 8.5686,
            "origin_lng": 76.8731,
            "dest_lat": 8.5284,
            "dest_lng": 76.9412,
            "is_auto_detected": 1,
            "is_synced": 1
        },
        {
            "title": "Weekend Backwaters & Heritage Expedition",
            "location": "Kochi to Alappuzha, Kerala",
            "start_date": "2026-08-22",
            "end_date": "2026-08-24",
            "note": "Scenic travel along NH 66; sampled fresh Karimeen and stayed at Punnamada houseboat.",
            "mood": "happy",
            "trip_number": 2,
            "origin": "Fort Kochi",
            "destination": "Punnamada Jetty, Alappuzha",
            "departure_time": "10:00",
            "arrival_time": "11:45",
            "travel_mode": "Car",
            "trip_purpose": "Tourism",
            "passenger_count": 3,
            "fare_cost": 650.0,
            "distance_km": 58.5,
            "duration_min": 105,
            "origin_lat": 9.9658,
            "origin_lng": 76.2421,
            "dest_lat": 9.5082,
            "dest_lng": 76.3458,
            "is_auto_detected": 0,
            "is_synced": 1
        },
        {
            "title": "Munnar Tea Plantation & Hill Safari",
            "location": "Munnar, Idukki",
            "start_date": "2026-08-15",
            "end_date": "2026-08-18",
            "note": "Explored Eravikulam National Park and Top Station with family.",
            "mood": "chill",
            "trip_number": 3,
            "origin": "Aluva Railway Station",
            "destination": "Munnar Town",
            "departure_time": "07:15",
            "arrival_time": "11:00",
            "travel_mode": "Bus",
            "trip_purpose": "Tourism",
            "passenger_count": 4,
            "fare_cost": 480.0,
            "distance_km": 118.0,
            "duration_min": 225,
            "origin_lat": 10.1076,
            "origin_lng": 76.3516,
            "dest_lat": 10.0889,
            "dest_lng": 77.0595,
            "is_auto_detected": 0,
            "is_synced": 1
        }
    ]
    for trip in sample_trips:
        cursor.execute("""
            INSERT INTO trips (
                title, location, start_date, end_date, note, mood, trip_number,
                origin, destination, departure_time, arrival_time, travel_mode,
                trip_purpose, passenger_count, fare_cost, distance_km, duration_min,
                origin_lat, origin_lng, dest_lat, dest_lng, is_auto_detected, is_synced
            ) VALUES (
                :title, :location, :start_date, :end_date, :note, :mood, :trip_number,
                :origin, :destination, :departure_time, :arrival_time, :travel_mode,
                :trip_purpose, :passenger_count, :fare_cost, :distance_km, :duration_min,
                :origin_lat, :origin_lng, :dest_lat, :dest_lng, :is_auto_detected, :is_synced
            );
        """, trip)
    conn.commit()

def execute_query(sql: str, params: Tuple = ()) -> Tuple[List[Dict[str, Any]], int]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        if sql.strip().upper().startswith("SELECT") or "RETURNING" in sql.strip().upper():
            rows = [dict(row) for row in cursor.fetchall()]
            return rows, len(rows)
        conn.commit()
        return [], cursor.rowcount
