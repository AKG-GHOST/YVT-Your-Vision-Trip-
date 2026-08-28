import os
import hashlib
import secrets
from pathlib import Path

WORKSPACE = Path(r"C:\Users\akhil\.gemini\antigravity\scratch")
BACKEND = WORKSPACE / "backend"
BACKEND.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# 1. backend/auth.py (Real Authentication & Password Security)
# -------------------------------------------------------------
auth_py = '''import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, Header, Depends
from backend.database import get_connection

def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations and random salt.
    """
    if not salt:
        salt = secrets.token_hex(16)
    pwd_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    hashed = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000)
    return hashed.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, password_hash)

def create_session_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now() + timedelta(days=30)).isoformat()
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO user_sessions (token, user_id, expires_at)
            VALUES (?, ?, ?);
        """, (token, user_id, expires_at))
        conn.commit()
    return token

def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT u.id, u.name, u.email, u.phone, u.home_location, u.work_location,
                   u.travel_mode_preference, u.created_at
            FROM users u
            JOIN user_sessions s ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > datetime('now', 'localtime');
        """, (token,))
        row = c.fetchone()
        if row:
            return dict(row)
    return None

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return get_user_from_token(parts[1])
    return None

def get_current_user_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    return user
'''
(BACKEND / "auth.py").write_text(auth_py, encoding="utf-8")

# -------------------------------------------------------------
# 2. Update backend/database.py to add users, sessions & food
# -------------------------------------------------------------
db_py = '''import os
import json
import sqlite3
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
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                phone TEXT DEFAULT '',
                home_location TEXT DEFAULT '',
                work_location TEXT DEFAULT '',
                travel_mode_preference TEXT DEFAULT 'Bus',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. User Sessions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT NOT NULL
            );
        """)

        # 3. Trips Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trips (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                title TEXT NOT NULL,
                location TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                note TEXT DEFAULT '',
                mood TEXT DEFAULT 'sunny',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                trip_number INTEGER DEFAULT 1,
                origin TEXT DEFAULT '',
                destination TEXT DEFAULT '',
                departure_time TEXT DEFAULT '',
                arrival_time TEXT DEFAULT '',
                travel_mode TEXT DEFAULT 'Bus',
                trip_purpose TEXT DEFAULT 'Tourism',
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
                gps_trace_json TEXT DEFAULT '[]'
            );
        """)
        
        # 4. Destinations Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS destinations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                state_region TEXT DEFAULT 'Kerala',
                category TEXT DEFAULT 'Tourism',
                description TEXT DEFAULT '',
                latitude REAL DEFAULT 0.0,
                longitude REAL DEFAULT 0.0,
                food_cuisine TEXT DEFAULT '[]',
                attractions TEXT DEFAULT '[]',
                hotels TEXT DEFAULT '[]',
                activities TEXT DEFAULT '[]',
                ratings REAL DEFAULT 4.5,
                approx_cost_per_day REAL DEFAULT 2000.0,
                best_season TEXT DEFAULT 'Oct - Mar',
                weather_summary TEXT DEFAULT 'Pleasant',
                image_url TEXT DEFAULT '',
                source TEXT DEFAULT 'local_cache',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Food & Culinary Items Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS food_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                region TEXT DEFAULT 'Kerala',
                category TEXT DEFAULT 'Traditional',
                description TEXT DEFAULT '',
                diet_type TEXT DEFAULT 'Non-Vegetarian',
                price_range TEXT DEFAULT '₹150 - ₹350',
                famous_spots TEXT DEFAULT '[]',
                image_url TEXT DEFAULT ''
            );
        """)
        
        # 6. NATPAC Surveys Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS natpac_surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT DEFAULT 'anonymous',
                age_group TEXT DEFAULT '18-35',
                gender TEXT DEFAULT 'Unspecified',
                occupation TEXT DEFAULT 'Working Professional',
                monthly_travel_budget REAL DEFAULT 3000.0,
                frequent_mode TEXT DEFAULT 'Bus / Public Transport',
                feedback TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 7. Tourism Cache Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tourism_cache (
                cache_key TEXT PRIMARY KEY,
                data_json TEXT NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT
            );
        """)
        
        # Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips(start_date DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_mode ON trips(travel_mode);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_destinations_name ON destinations(name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_food_name ON food_items(name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        
        conn.commit()
        seed_default_user_if_empty(cursor, conn)
        seed_destinations_if_empty(cursor, conn)
        seed_food_if_empty(cursor, conn)
        seed_sample_trips_if_empty(cursor, conn)

def seed_default_user_if_empty(cursor, conn):
    cursor.execute("SELECT COUNT(*) as cnt FROM users;")
    if cursor.fetchone()["cnt"] > 0:
        return
    import secrets, hashlib
    salt = secrets.token_hex(16)
    pwd_bytes = "password123".encode("utf-8")
    salt_bytes = salt.encode("utf-8")
    hashed = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100000).hex()
    cursor.execute("""
        INSERT INTO users (id, name, email, password_hash, salt, phone, home_location, work_location, travel_mode_preference)
        VALUES (1, 'NATPAC Commuter', 'commuter@natpac.kerala.gov.in', ?, ?, '+91 98470 12345', 'Kazhakkoottam, Trivandrum', 'Pattom (NATPAC HQ)', 'Bus');
    """, (hashed, salt))
    conn.commit()

def seed_food_if_empty(cursor, conn):
    cursor.execute("SELECT COUNT(*) as cnt FROM food_items;")
    if cursor.fetchone()["cnt"] > 0:
        return
    sample_foods = [
        {
            "name": "Karimeen Pollichathu",
            "region": "Alappuzha / Kumarakom",
            "category": "Seafood Delicacy",
            "description": "Pearl Spot fish marinated in spicy local masala, wrapped in fresh banana leaf and slow-cooked to perfection over coconut shell embers.",
            "diet_type": "Seafood",
            "price_range": "₹350 - ₹650",
            "famous_spots": json.dumps(["Kumarakom Lake Shacks", "Mullakkal Dhabas, Alappuzha", "Grand Hotel Kochi"]),
            "image_url": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600"
        },
        {
            "name": "Appam with Vegetable / Chicken Stew",
            "region": "Central Travancore & Kochi",
            "category": "Breakfast & Dinner",
            "description": "Lacy, bowl-shaped fermented rice pancake with a soft spongy centre, served with mild creamy coconut milk stew infused with whole spices.",
            "diet_type": "Vegetarian / Non-Vegetarian",
            "price_range": "₹120 - ₹250",
            "famous_spots": json.dumps(["Indian Coffee House", "Paragon Restaurant, Kochi", "Aryaas Heritage"]),
            "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600"
        },
        {
            "name": "Traditional Kerala Sadya",
            "region": "Pan-Kerala",
            "category": "Feast / Festive Lunch",
            "description": "Elaborate vegetarian feast served on fresh plantain leaf with red rice, Parippu, Sambar, Avial, Thoran, Olan, Kaalan, Pachadi, and Palada Payasam.",
            "diet_type": "Pure Vegetarian",
            "price_range": "₹180 - ₹350",
            "famous_spots": json.dumps(["Mothers Veg Plaza, Trivandrum", "BTH Sarovaram, Kochi", "Brindavan, Trivandrum"]),
            "image_url": "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600"
        },
        {
            "name": "Malabar Biryani (Khaima Rice)",
            "region": "Kozhikode & Malabar",
            "category": "Iconic Main Course",
            "description": "Fragrant Biryani prepared with short-grain Jeerakasala rice, marinated tender chicken/mutton, fried onions, cashews, and raisins with date pickle.",
            "diet_type": "Non-Vegetarian",
            "price_range": "₹220 - ₹380",
            "famous_spots": json.dumps(["Paragon Restaurant, Calicut", "Rahmath Hotel, Kozhikode", "Kayees Rahmathulla, Mattancherry"]),
            "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600"
        },
        {
            "name": "Puttu and Kadala Curry",
            "region": "Pan-Kerala",
            "category": "Traditional Breakfast",
            "description": "Steamed cylinders of ground rice layered with grated coconut shavings, served with rich spicy black chickpea curry and ripe golden bananas.",
            "diet_type": "Vegetarian",
            "price_range": "₹80 - ₹150",
            "famous_spots": json.dumps(["Dhe Puttu, Kochi", "Puttu Kada, Trivandrum", "Local Tea Stalls across Kerala"]),
            "image_url": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600"
        },
        {
            "name": "Boli with Paal Payasam",
            "region": "Thiruvananthapuram",
            "category": "Capital Dessert Special",
            "description": "Sweet golden-yellow lentil flatbread infused with cardamom, eaten by dipping into thick, slow-cooked creamy milk and rice pudding.",
            "diet_type": "Vegetarian Dessert",
            "price_range": "₹90 - ₹160",
            "famous_spots": json.dumps(["Maha Boli, Trivandrum", "Pazhavangadi Sweet Stalls", "Ambalapuzha Temple Canteen"]),
            "image_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600"
        }
    ]
    for item in sample_foods:
        cursor.execute("""
            INSERT INTO food_items (name, region, category, description, diet_type, price_range, famous_spots, image_url)
            VALUES (:name, :region, :category, :description, :diet_type, :price_range, :famous_spots, :image_url);
        """, item)
    conn.commit()

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
            "user_id": 1,
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
            "user_id": 1,
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
            "user_id": 1,
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
                user_id, title, location, start_date, end_date, note, mood, trip_number,
                origin, destination, departure_time, arrival_time, travel_mode,
                trip_purpose, passenger_count, fare_cost, distance_km, duration_min,
                origin_lat, origin_lng, dest_lat, dest_lng, is_auto_detected, is_synced
            ) VALUES (
                :user_id, :title, :location, :start_date, :end_date, :note, :mood, :trip_number,
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
'''
(BACKEND / "database.py").write_text(db_py, encoding="utf-8")

# -------------------------------------------------------------
# 3. Update backend/models.py
# -------------------------------------------------------------
models_py = '''from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr

# Authentication Models
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = ""
    home_location: Optional[str] = ""
    work_location: Optional[str] = ""
    travel_mode_preference: Optional[str] = "Bus"

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_location: Optional[str] = None
    work_location: Optional[str] = None
    travel_mode_preference: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = ""
    home_location: Optional[str] = ""
    work_location: Optional[str] = ""
    travel_mode_preference: Optional[str] = "Bus"
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    message: str = "Success"

# Trip Models
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
    user_id: Optional[int] = 1
    created_at: Optional[str] = None

# AI Models
class AIRouteRequest(BaseModel):
    prompt: str

class AIRouteResponse(BaseModel):
    mode: str = "demo"
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

# Food & Tourism Models
class FoodItemResponse(BaseModel):
    id: int
    name: str
    region: str
    category: str
    description: str
    diet_type: str
    price_range: str
    famous_spots: List[str]
    image_url: str

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
    users_count: int = 0
'''
(BACKEND / "models.py").write_text(models_py, encoding="utf-8")

# -------------------------------------------------------------
# 4. Update backend/tourism_service.py to add food search
# -------------------------------------------------------------
tourism_py = '''import json
import sqlite3
import httpx
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from backend.database import get_connection

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
USER_AGENT = "TripTrail-NATPAC-Tourism/2.0 (SIH-2025; contact: travel@natpac.kerala.gov.in)"

async def reverse_geocode_osm(lat: float, lng: float) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": USER_AGENT}) as client:
            res = await client.get(
                REVERSE_GEOCODE_URL,
                params={"lat": lat, "lon": lng, "format": "json", "zoom": 18, "addressdetails": 1}
            )
            if res.status_code == 200:
                data = res.json()
                addr = data.get("address", {})
                display = data.get("display_name", "")
                locality = addr.get("suburb") or addr.get("neighbourhood") or addr.get("village") or addr.get("town") or addr.get("city") or addr.get("county") or "Detected Location"
                district = addr.get("state_district") or addr.get("county") or addr.get("state") or "Kerala"
                return {
                    "success": True,
                    "display_name": display,
                    "locality": locality,
                    "district": district,
                    "road": addr.get("road", ""),
                    "city": addr.get("city") or addr.get("town") or addr.get("suburb", ""),
                    "state": addr.get("state", "Kerala"),
                    "postcode": addr.get("postcode", "")
                }
    except Exception as e:
        print(f"Reverse geocode error: {e}")
    return {
        "success": False,
        "display_name": f"Location ({lat:.4f}, {lng:.4f})",
        "locality": f"Lat: {lat:.3f}, Lng: {lng:.3f}",
        "district": "Kerala",
        "road": "",
        "city": "",
        "state": "Kerala",
        "postcode": ""
    }

async def geocode_place_osm(query: str) -> Optional[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": USER_AGENT}) as client:
            res = await client.get(
                NOMINATIM_URL,
                params={"q": query, "format": "json", "limit": 1, "addressdetails": 1}
            )
            if res.status_code == 200 and res.json():
                item = res.json()[0]
                return {
                    "name": item.get("display_name", query),
                    "lat": float(item.get("lat", 0.0)),
                    "lng": float(item.get("lon", 0.0)),
                    "type": item.get("type", "tourism")
                }
    except Exception as e:
        print(f"Geocode place error: {e}")
    return None

async def fetch_live_weather(lat: float, lng: float) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            params = {
                "latitude": lat,
                "longitude": lng,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
                "timezone": "auto"
            }
            res = await client.get(OPEN_METEO_URL, params=params)
            if res.status_code == 200:
                data = res.json()
                current = data.get("current", {})
                daily = data.get("daily", {})
                temp = current.get("temperature_2m", 26.0)
                code = current.get("weather_code", 0)
                humidity = current.get("relative_humidity_2m", 70)
                wind = current.get("wind_speed_10m", 8.5)
                condition = "Sunny & Clear"
                if code in [1, 2, 3]:
                    condition = "Partly Cloudy & Pleasant"
                elif code in [45, 48]:
                    condition = "Misty / Foggy"
                elif code in [51, 53, 55, 61, 63, 65, 80, 81]:
                    condition = "Tropical Showers / Light Rain"
                elif code in [95, 96, 99]:
                    condition = "Thunderstorms & Rain"
                min_temp = daily.get("temperature_2m_min", [22])[0]
                max_temp = daily.get("temperature_2m_max", [30])[0]
                return {
                    "temperature": temp,
                    "condition": condition,
                    "humidity": f"{humidity}%",
                    "wind_speed": f"{wind} km/h",
                    "min_temp": min_temp,
                    "max_temp": max_temp,
                    "summary": f"{condition} ({temp}°C, Min: {min_temp}°C / Max: {max_temp}°C)"
                }
    except Exception as e:
        print(f"Weather fetch error: {e}")
    return {
        "temperature": 27.5,
        "condition": "Pleasant Tropical Climate",
        "humidity": "72%",
        "wind_speed": "10 km/h",
        "min_temp": 23.0,
        "max_temp": 31.0,
        "summary": "Pleasant Tropical Climate (27°C)"
    }

async def fetch_wikivoyage_data(place_name: str) -> Dict[str, Any]:
    clean_name = place_name.split("(")[0].strip()
    encoded = clean_name.replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded}"
    try:
        async with httpx.AsyncClient(timeout=8.0, headers={"User-Agent": USER_AGENT}) as client:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                extract = data.get("extract", "")
                img_url = data.get("thumbnail", {}).get("source", "")
                return {
                    "description": extract,
                    "image_url": img_url,
                    "title": data.get("title", clean_name)
                }
    except Exception as e:
        print(f"Wikivoyage fetch error: {e}")
    return {
        "description": f"{clean_name} is an attractive tourism and cultural destination in Kerala / South India offering rich heritage, dining, and sightseeing.",
        "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80",
        "title": clean_name
    }

def get_all_destinations() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM destinations ORDER BY ratings DESC, name ASC;")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["food_cuisine"] = json.loads(d["food_cuisine"]) if isinstance(d["food_cuisine"], str) else d["food_cuisine"]
            d["attractions"] = json.loads(d["attractions"]) if isinstance(d["attractions"], str) else d["attractions"]
            d["hotels"] = json.loads(d["hotels"]) if isinstance(d["hotels"], str) else d["hotels"]
            d["activities"] = json.loads(d["activities"]) if isinstance(d["activities"], str) else d["activities"]
            result.append(d)
        return result

def get_destination_by_name(name: str) -> Optional[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM destinations WHERE LOWER(name) LIKE ? OR LOWER(name) LIKE ?;", (f"{name.lower()}%", f"%{name.lower()}%"))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["food_cuisine"] = json.loads(d["food_cuisine"]) if isinstance(d["food_cuisine"], str) else d["food_cuisine"]
        d["attractions"] = json.loads(d["attractions"]) if isinstance(d["attractions"], str) else d["attractions"]
        d["hotels"] = json.loads(d["hotels"]) if isinstance(d["hotels"], str) else d["hotels"]
        d["activities"] = json.loads(d["activities"]) if isinstance(d["activities"], str) else d["activities"]
        return d

async def fetch_and_cache_live_destination(place_name: str) -> Dict[str, Any]:
    existing = get_destination_by_name(place_name)
    if existing and existing.get("source") != "local_cache":
        weather = await fetch_live_weather(existing["latitude"], existing["longitude"])
        existing["weather_live"] = weather
        return existing
    geo = await geocode_place_osm(place_name)
    lat = geo["lat"] if geo else 10.0
    lng = geo["lng"] if geo else 76.5
    wiki = await fetch_wikivoyage_data(place_name)
    weather = await fetch_live_weather(lat, lng)
    clean_title = place_name.strip().title()
    description = wiki.get("description") or f"{clean_title} is a renowned travel destination featuring scenic landscapes, heritage, and local cultural life."
    image_url = wiki.get("image_url") or "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=800&auto=format&fit=crop&q=80"
    food_items = [
        f"Authentic {clean_title} Local Delicacies & Snacks",
        "Traditional Kerala Sadya on Fresh Plantain Leaf",
        "Appam with Creamy Vegetable or Chicken Stew",
        "Hot Steaming Chai & Fresh Banana Fritters"
    ]
    attraction_items = [
        f"{clean_title} Central Heritage & Scenic Viewpoint",
        f"{clean_title} Botanical Gardens & Lake Walk",
        "Historic Cultural Landmark & Architectural Monument",
        "Local Handicrafts & Spice Marketplace"
    ]
    hotel_items = [
        {"name": f"{clean_title} Heritage & Spa Resort", "type": "Luxury Resort", "price_range": "₹7,500 - ₹14,000/night", "rating": 4.8},
        {"name": f"{clean_title} KTDC / Boutique Hotel", "type": "Mid-Range", "price_range": "₹3,000 - ₹5,500/night", "rating": 4.5},
        {"name": f"{clean_title} Cozy Backpacker Homestay", "type": "Budget Homestay", "price_range": "₹1,200 - ₹2,200/night", "rating": 4.4}
    ]
    activity_items = [
        f"Guided Cultural Walking Tour across {clean_title}",
        "Scenic Nature Photography & Sunset Observation",
        "Visiting Local Artisan Weaving & Spice Workshop",
        "Ayurvedic Rejuvenation & Herbal Wellness Treatment"
    ]
    record = {
        "name": clean_title,
        "state_region": "Kerala / India",
        "category": "Tourist Destination",
        "description": description,
        "latitude": lat,
        "longitude": lng,
        "food_cuisine": json.dumps(food_items),
        "attractions": json.dumps(attraction_items),
        "hotels": json.dumps(hotel_items),
        "activities": json.dumps(activity_items),
        "ratings": 4.6,
        "approx_cost_per_day": 2700.0,
        "best_season": "October to March",
        "weather_summary": weather.get("summary", "Pleasant Tropical Climate"),
        "image_url": image_url,
        "source": "live_api"
    }
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO destinations (
                name, state_region, category, description, latitude, longitude,
                food_cuisine, attractions, hotels, activities, ratings, approx_cost_per_day,
                best_season, weather_summary, image_url, source
            ) VALUES (
                :name, :state_region, :category, :description, :latitude, :longitude,
                :food_cuisine, :attractions, :hotels, :activities, :ratings, :approx_cost_per_day,
                :best_season, :weather_summary, :image_url, :source
            )
            ON CONFLICT(name) DO UPDATE SET
                latitude=excluded.latitude,
                longitude=excluded.longitude,
                description=excluded.description,
                weather_summary=excluded.weather_summary,
                image_url=excluded.image_url,
                source=excluded.source,
                updated_at=CURRENT_TIMESTAMP;
        """, record)
        conn.commit()
    return get_destination_by_name(clean_title) or record

def get_food_items(diet: Optional[str] = None, q: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_connection() as conn:
        c = conn.cursor()
        query = "SELECT * FROM food_items WHERE 1=1"
        params = []
        if diet and diet.lower() != 'all':
            query += " AND LOWER(diet_type) LIKE ?"
            params.append(f"%{diet.lower()}%")
        if q:
            query += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(region) LIKE ?)"
            params.extend([f"%{q.lower()}%", f"%{q.lower()}%", f"%{q.lower()}%"])
        query += " ORDER BY id ASC;"
        c.execute(query, tuple(params))
        rows = [dict(r) for r in c.fetchall()]
        for r in rows:
            r["famous_spots"] = json.loads(r["famous_spots"]) if isinstance(r["famous_spots"], str) else r["famous_spots"]
        return rows
'''
(BACKEND / "tourism_service.py").write_text(tourism_py, encoding="utf-8")

# -------------------------------------------------------------
# 5. Update backend/app.py with Auth & Food Endpoints
# -------------------------------------------------------------
app_py = '''import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from backend.database import get_connection, init_db, execute_query
from backend.auth import (
    hash_password, verify_password, create_session_token,
    get_current_user_optional, get_current_user_required
)
from backend.models import (
    UserRegister, UserLogin, UserProfileUpdate, UserResponse, AuthResponse,
    AIRouteRequest, AIRouteResponse,
    AIParsedTripRequest, AIParsedTripResponse,
    AIItineraryRequest, AIItineraryResponse,
    DestinationCreate, LiveTourismFetchRequest, FoodItemResponse,
    SQLQueryRequest, SQLQueryResponse,
    StatusResponse, TripCreate, TripResponse
)
from backend.ai_service import plan_route_ai, parse_trip_from_text, generate_smart_itinerary
from backend.tourism_service import (
    get_all_destinations, get_destination_by_name,
    fetch_and_cache_live_destination, reverse_geocode_osm, geocode_place_osm,
    get_food_items
)
from backend.analytics_service import (
    get_summary_metrics, get_mode_split_metrics,
    get_peak_travel_hours_metrics, get_purpose_split_metrics,
    get_od_matrix_metrics, export_trips_to_csv
)

app = FastAPI(
    title="TripTrail & NATPAC Mobile Travel Survey Platform",
    description="Production Mobile Backend for SIH 2025 (Problem 25082) - NATPAC Travel Survey, Real-World Tourism APIs, and AI Engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# -------------------------------------------------------------
# 1. Authentication & User Profile Endpoints
# -------------------------------------------------------------
@app.post("/api/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    pwd_hash, salt = hash_password(payload.password)
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM users WHERE email = ?;", (email,))
        if c.fetchone():
            raise HTTPException(status_code=400, detail="Account with this email already exists.")
        
        c.execute("""
            INSERT INTO users (name, email, password_hash, salt, phone, home_location, work_location, travel_mode_preference)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (payload.name, email, pwd_hash, salt, payload.phone or '', payload.home_location or '', payload.work_location or '', payload.travel_mode_preference or 'Bus'))
        conn.commit()
        user_id = c.lastrowid
        
        c.execute("SELECT id, name, email, phone, home_location, work_location, travel_mode_preference, created_at FROM users WHERE id = ?;", (user_id,))
        user_row = dict(c.fetchone())
        token = create_session_token(user_id)
        return {"token": token, "user": user_row, "message": "Account created successfully!"}

@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: UserLogin):
    email = payload.email.strip().lower()
    with get_connection() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?;", (email,))
        user = c.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        user_dict = dict(user)
        if not verify_password(payload.password, user_dict["password_hash"], user_dict["salt"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        
        token = create_session_token(user_dict["id"])
        c.execute("SELECT id, name, email, phone, home_location, work_location, travel_mode_preference, created_at FROM users WHERE id = ?;", (user_dict["id"],))
        user_row = dict(c.fetchone())
        return {"token": token, "user": user_row, "message": "Login successful!"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_profile(user: Dict[str, Any] = Depends(get_current_user_required)):
    return user

@app.put("/api/auth/profile", response_model=UserResponse)
def update_profile(payload: UserProfileUpdate, user: Dict[str, Any] = Depends(get_current_user_required)):
    updates = []
    params = []
    if payload.name is not None:
        updates.append("name = ?")
        params.append(payload.name)
    if payload.phone is not None:
        updates.append("phone = ?")
        params.append(payload.phone)
    if payload.home_location is not None:
        updates.append("home_location = ?")
        params.append(payload.home_location)
    if payload.work_location is not None:
        updates.append("work_location = ?")
        params.append(payload.work_location)
    if payload.travel_mode_preference is not None:
        updates.append("travel_mode_preference = ?")
        params.append(payload.travel_mode_preference)
    
    if updates:
        params.append(user["id"])
        with get_connection() as conn:
            c = conn.cursor()
            c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?;", tuple(params))
            conn.commit()
            c.execute("SELECT id, name, email, phone, home_location, work_location, travel_mode_preference, created_at FROM users WHERE id = ?;", (user["id"],))
            return dict(c.fetchone())
    return user

@app.post("/api/auth/logout")
def logout_user(request: Request):
    auth_header = request.headers.get("authorization", "")
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM user_sessions WHERE token = ?;", (parts[1],))
            conn.commit()
    return {"success": True, "message": "Logged out"}

# -------------------------------------------------------------
# 2. Database Health, Status, Setup & Raw Query Endpoints
# -------------------------------------------------------------
@app.get("/api/status")
def get_status():
    try:
        with get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as t_cnt FROM trips;")
            trips_count = c.fetchone()["t_cnt"]
            c.execute("SELECT COUNT(*) as d_cnt FROM destinations;")
            dest_count = c.fetchone()["d_cnt"]
            c.execute("SELECT COUNT(*) as u_cnt FROM users;")
            users_count = c.fetchone()["u_cnt"]
            return {
                "connected": True,
                "version": "SQLite 3.x (WAL Enabled, Python Backend)",
                "checkedAt": datetime.now().isoformat(),
                "mode": "python_sqlite",
                "database_url_configured": bool(os.getenv("DATABASE_URL")),
                "trips_count": trips_count,
                "destinations_count": dest_count,
                "users_count": users_count
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

@app.post("/api/query")
def run_sql_query(payload: SQLQueryRequest):
    sql = payload.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query required")
    try:
        rows, row_count = execute_query(sql)
        return {"rows": rows, "rowCount": row_count}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------------------------------------
# 3. Trips & NATPAC Travel Survey Endpoints (User-Scoped)
# -------------------------------------------------------------
@app.get("/api/trips")
def list_trips(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    with get_connection() as conn:
        c = conn.cursor()
        if user:
            c.execute("""
                SELECT id, user_id, title, location, start_date, end_date, note, mood,
                       trip_number, origin, destination, departure_time, arrival_time,
                       travel_mode, trip_purpose, passenger_count, fare_cost, distance_km,
                       duration_min, origin_lat, origin_lng, dest_lat, dest_lng,
                       is_auto_detected, is_synced, created_at
                FROM trips
                WHERE user_id = ? OR user_id = 1
                ORDER BY start_date DESC, id DESC;
            """, (user["id"],))
        else:
            c.execute("""
                SELECT id, user_id, title, location, start_date, end_date, note, mood,
                       trip_number, origin, destination, departure_time, arrival_time,
                       travel_mode, trip_purpose, passenger_count, fare_cost, distance_km,
                       duration_min, origin_lat, origin_lng, dest_lat, dest_lng,
                       is_auto_detected, is_synced, created_at
                FROM trips
                ORDER BY start_date DESC, id DESC;
            """)
        rows = [dict(r) for r in c.fetchall()]
        return rows

@app.post("/api/trips", status_code=status.HTTP_201_CREATED)
def create_trip(trip: TripCreate, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    if not trip.title or not trip.location or not trip.start_date or not trip.end_date:
        raise HTTPException(status_code=400, detail="Title, location, and dates are required.")
    
    user_id = user["id"] if user else 1
    trip_dict = trip.model_dump()
    trip_dict["user_id"] = user_id

    with get_connection() as conn:
        c = conn.cursor()
        c.execute("""
            INSERT INTO trips (
                user_id, title, location, start_date, end_date, note, mood, trip_number,
                origin, destination, departure_time, arrival_time, travel_mode,
                trip_purpose, passenger_count, fare_cost, distance_km, duration_min,
                origin_lat, origin_lng, dest_lat, dest_lng, is_auto_detected, is_synced, gps_trace_json
            ) VALUES (
                :user_id, :title, :location, :start_date, :end_date, :note, :mood, :trip_number,
                :origin, :destination, :departure_time, :arrival_time, :travel_mode,
                :trip_purpose, :passenger_count, :fare_cost, :distance_km, :duration_min,
                :origin_lat, :origin_lng, :dest_lat, :dest_lng, :is_auto_detected, :is_synced, :gps_trace_json
            );
        """, trip_dict)
        conn.commit()
        trip_id = c.lastrowid
        c.execute("SELECT * FROM trips WHERE id = ?;", (trip_id,))
        created = dict(c.fetchone())
        return created

@app.delete("/api/trips/{trip_id}")
def delete_trip(trip_id: int, user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    with get_connection() as conn:
        c = conn.cursor()
        if user:
            c.execute("DELETE FROM trips WHERE id = ? AND (user_id = ? OR user_id = 1);", (trip_id, user["id"]))
        else:
            c.execute("DELETE FROM trips WHERE id = ?;", (trip_id,))
        conn.commit()
        if c.rowcount == 0:
            raise HTTPException(status_code=404, detail="Trip not found")
        return {"success": True, "deleted_id": trip_id}

# -------------------------------------------------------------
# 4. AI Services (Route, NLP Trip Parser & Itinerary)
# -------------------------------------------------------------
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

# -------------------------------------------------------------
# 5. Food & Tourism Real-World APIs
# -------------------------------------------------------------
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

@app.get("/api/tourism/food")
def list_food(diet: Optional[str] = None, q: Optional[str] = None):
    return get_food_items(diet=diet, q=q)

# -------------------------------------------------------------
# 6. Geocoding & GPS Location Services
# -------------------------------------------------------------
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

# -------------------------------------------------------------
# 7. NATPAC Transportation Planning Analytics Endpoints
# -------------------------------------------------------------
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

# -------------------------------------------------------------
# 8. Static Frontend & SPA Serving
# -------------------------------------------------------------
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
'''
(BACKEND / "app.py").write_text(app_py, encoding="utf-8")

print("Production backend files written successfully!")
