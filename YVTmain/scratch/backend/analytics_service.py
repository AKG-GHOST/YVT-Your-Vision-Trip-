import csv
import io
import sqlite3
from typing import Any, Dict, List
from backend.database import get_connection

def get_summary_metrics() -> Dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total_trips, SUM(distance_km) as total_dist, AVG(duration_min) as avg_dur, SUM(fare_cost) as total_fare, SUM(passenger_count) as total_passengers FROM trips;")
        row = dict(cursor.fetchone())
        total_trips = row.get("total_trips") or 0
        total_dist = round(row.get("total_dist") or 0.0, 1)
        avg_dur = round(row.get("avg_dur") or 0.0, 1)
        total_fare = round(row.get("total_fare") or 0.0, 1)
        total_passengers = row.get("total_passengers") or 0
        p_km = round(total_dist * max(1, total_passengers / max(1, total_trips)), 1)
        est_co2_kg = round(total_dist * 0.115, 1)
        return {
            "total_trips": total_trips,
            "total_distance_km": total_dist,
            "avg_duration_min": avg_dur,
            "total_fare_collected": total_fare,
            "total_passengers": total_passengers,
            "passenger_km": p_km,
            "estimated_co2_kg": est_co2_kg,
            "organization": "NATPAC (National Transportation Planning and Research Centre)",
            "state": "Government of Kerala"
        }

def get_mode_split_metrics() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT travel_mode, COUNT(*) as trip_count, SUM(distance_km) as total_km, AVG(fare_cost) as avg_fare
            FROM trips
            GROUP BY travel_mode
            ORDER BY trip_count DESC;
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        total_count = sum(r["trip_count"] for r in rows) or 1
        for r in rows:
            r["percentage"] = round((r["trip_count"] / total_count) * 100.0, 1)
            r["total_km"] = round(r["total_km"] or 0.0, 1)
            r["avg_fare"] = round(r["avg_fare"] or 0.0, 1)
        return rows

def get_peak_travel_hours_metrics() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT departure_time, COUNT(*) as trip_count
            FROM trips
            WHERE departure_time != ""
            GROUP BY departure_time;
        """)
        rows = cursor.fetchall()
        hourly = {h: 0 for h in range(24)}
        for r in rows:
            dep = r["departure_time"]
            try:
                hour = int(dep.split(":")[0])
                if 0 <= hour < 24:
                    hourly[hour] += r["trip_count"]
            except (ValueError, IndexError):
                pass
        result = []
        for h in range(6, 23):
            label = f"{h:02d}:00"
            result.append({"hour": h, "label": label, "trip_count": hourly[h]})
        return result

def get_purpose_split_metrics() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT trip_purpose, COUNT(*) as trip_count
            FROM trips
            GROUP BY trip_purpose
            ORDER BY trip_count DESC;
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        total = sum(r["trip_count"] for r in rows) or 1
        for r in rows:
            r["percentage"] = round((r["trip_count"] / total) * 100.0, 1)
        return rows

def get_od_matrix_metrics() -> List[Dict[str, Any]]:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT origin, destination, travel_mode, COUNT(*) as flow_volume, AVG(duration_min) as avg_duration, AVG(distance_km) as avg_distance
            FROM trips
            WHERE origin != "" AND destination != ""
            GROUP BY origin, destination, travel_mode
            ORDER BY flow_volume DESC
            LIMIT 15;
        """)
        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["avg_duration"] = round(r["avg_duration"] or 0.0, 1)
            r["avg_distance"] = round(r["avg_distance"] or 0.0, 1)
        return rows

def export_trips_to_csv() -> str:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, trip_number, title, origin, destination, location, start_date, departure_time, arrival_time,
                   travel_mode, trip_purpose, passenger_count, fare_cost, distance_km, duration_min,
                   origin_lat, origin_lng, dest_lat, dest_lng, is_auto_detected, mood, note, created_at
            FROM trips
            ORDER BY id ASC;
        """)
        rows = cursor.fetchall()
        output = io.StringIO()
        if not rows:
            return "No trip records available."
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Trip_Sequence", "Trip_Title", "Origin", "Destination", "Location_Summary",
            "Travel_Date", "Departure_Time", "Arrival_Time", "Travel_Mode", "Trip_Purpose",
            "Passenger_Count", "Fare_Expenditure_INR", "Distance_KM", "Duration_Min",
            "Origin_Lat", "Origin_Lng", "Dest_Lat", "Dest_Lng", "Auto_Detected_Flag", "Mood", "Survey_Notes", "Timestamp"
        ])
        for r in rows:
            writer.writerow(list(r))
        return output.getvalue()
