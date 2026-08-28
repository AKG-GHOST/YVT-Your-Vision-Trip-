import unittest
from fastapi.testclient import TestClient
from backend.app import app
from backend.database import init_db

class TestTripTrailNATPAC(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_01_status(self):
        res = self.client.get('/api/status')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['connected'])
        self.assertEqual(data['mode'], 'python_sqlite')

    def test_02_trips_crud(self):
        # 1. GET trips
        res = self.client.get('/api/trips')
        self.assertEqual(res.status_code, 200)
        initial_count = len(res.json())

        # 2. POST new NATPAC trip
        payload = {
            'title': 'Test Survey Trip to Technopark',
            'location': 'Kowdiar to Technopark',
            'start_date': '2026-08-28',
            'end_date': '2026-08-28',
            'origin': 'Kowdiar, Trivandrum',
            'destination': 'Technopark Phase 1',
            'departure_time': '08:45',
            'arrival_time': '09:20',
            'travel_mode': 'Bus',
            'trip_purpose': 'Work',
            'passenger_count': 1,
            'fare_cost': 35.0,
            'distance_km': 16.5,
            'duration_min': 35,
            'is_auto_detected': 1,
            'is_synced': 1,
            'note': 'Smooth KSRTC city electric bus ride.',
            'mood': 'happy'
        }
        res = self.client.post('/api/trips', json=payload)
        self.assertEqual(res.status_code, 201)
        created = res.json()
        self.assertIn('id', created)
        new_id = created['id']
        self.assertEqual(created['title'], payload['title'])

        # 3. Verify in list
        res = self.client.get('/api/trips')
        self.assertEqual(len(res.json()), initial_count + 1)

        # 4. DELETE trip
        del_res = self.client.delete(f'/api/trips/{new_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.json()['success'])

    def test_03_ai_route(self):
        res = self.client.post('/api/ai/route', json={'prompt': 'Thiruvananthapuram -> Kochi -> Munnar'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('stops', data)
        self.assertGreaterEqual(len(data['stops']), 2)
        self.assertIn('distance', data)
        self.assertIn('duration', data)
        self.assertIn('mapsUrl', data)

    def test_04_ai_parse_trip(self):
        # Case A: Metro commute
        res1 = self.client.post('/api/ai/parse-trip', json={
            'text': 'Took Kochi metro from Aluva to MG Road at 9:15 AM for university exam, ticket was 40 rs'
        })
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()
        self.assertTrue(data1['success'])
        self.assertEqual(data1['travel_mode'], 'Metro')
        self.assertEqual(data1['origin'], 'Aluva')
        self.assertEqual(data1['destination'], 'Mg Road')
        self.assertEqual(data1['trip_purpose'], 'Education')
        self.assertEqual(data1['fare_cost'], 40.0)

        # Case B: Car road trip
        res2 = self.client.post('/api/ai/parse-trip', json={
            'text': 'Drove car from Kochi to Munnar at 6:00 AM for sightseeing holiday with family, fuel 1200 rupees'
        })
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2['travel_mode'], 'Car')
        self.assertEqual(data2['origin'], 'Kochi')
        self.assertEqual(data2['destination'], 'Munnar')
        self.assertEqual(data2['trip_purpose'], 'Tourism')
        self.assertEqual(data2['fare_cost'], 1200.0)

    def test_05_ai_itinerary(self):
        res = self.client.post('/api/ai/itinerary', json={
            'destination': 'Munnar',
            'days': 3,
            'budget': 'moderate'
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['destination'], 'Munnar')
        self.assertEqual(len(data['daily_plan']), 3)

    def test_06_tourism_destinations(self):
        res = self.client.get('/api/tourism/destinations')
        self.assertEqual(res.status_code, 200)
        dests = res.json()
        self.assertGreaterEqual(len(dests), 5)
        munnar = next(d for d in dests if d['name'] == 'Munnar')
        self.assertIn('food_cuisine', munnar)
        self.assertIn('attractions', munnar)
        self.assertIn('hotels', munnar)
        self.assertIn('activities', munnar)

    def test_07_analytics(self):
        # 1. Summary
        sum_res = self.client.get('/api/analytics/summary')
        self.assertEqual(sum_res.status_code, 200)
        self.assertIn('total_trips', sum_res.json())

        # 2. Mode split
        mode_res = self.client.get('/api/analytics/mode-split')
        self.assertEqual(mode_res.status_code, 200)
        self.assertIsInstance(mode_res.json(), list)

        # 3. Peak hours
        peak_res = self.client.get('/api/analytics/peak-hours')
        self.assertEqual(peak_res.status_code, 200)
        self.assertIsInstance(peak_res.json(), list)

        # 4. OD matrix
        od_res = self.client.get('/api/analytics/od-matrix')
        self.assertEqual(od_res.status_code, 200)
        self.assertIsInstance(od_res.json(), list)

        # 5. CSV export
        csv_res = self.client.get('/api/analytics/export/csv')
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn('text/csv', csv_res.headers['content-type'])

    def test_08_sql_query(self):
        res = self.client.post('/api/query', json={'sql': 'SELECT COUNT(*) as count FROM trips;'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('rows', res.json())

    def test_09_static_frontend(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/html', res.headers['content-type'])
        self.assertIn('TripTrail', res.text)

if __name__ == '__main__':
    unittest.main()
