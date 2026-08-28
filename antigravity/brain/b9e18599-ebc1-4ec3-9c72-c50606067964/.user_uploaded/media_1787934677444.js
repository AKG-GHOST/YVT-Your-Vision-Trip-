import 'dotenv/config'
import express from 'express'
import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const app = express()
const port = process.env.PORT || 8787
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined }) : null
const root = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json())
app.post('/api/ai/route', async (request, response) => {
  const prompt = String(request.body.prompt || '').trim()
  if (!prompt) return response.status(400).json({ error: 'Tell me where you want to go.' })
  let stops = prompt.split(/\s*(?:->|→|,|\band then\b|\bthen\b)\s*/i).map(stop => stop.trim()).filter(Boolean).slice(0, 8)
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Extract a driving itinerary from the user request. Return JSON only in the shape {"stops":["place 1","place 2"]}. Keep at most 8 stops.' }, { role: 'user', content: prompt }] }) })
      const aiData = await aiResponse.json()
      stops = JSON.parse(aiData.choices?.[0]?.message?.content || '{}').stops || stops
    } catch (error) {
      console.error(`AI route planning fallback: ${error.message}`)
    }
  }
  if (stops.length < 2) stops = ['Bengaluru', 'Mysuru', 'Coorg']
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stops[0])}&destination=${encodeURIComponent(stops.at(-1))}&waypoints=${encodeURIComponent(stops.slice(1, -1).join('|'))}`
  if (!process.env.GOOGLE_MAPS_API_KEY) return response.json({ mode: 'demo', stops, distance: '312 km', duration: '6 hr 48 min', mapsUrl, message: 'Add GOOGLE_MAPS_API_KEY for live routing.' })
  try {
    const routeResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY, 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline' }, body: JSON.stringify({ origin: { address: stops[0] }, destination: { address: stops.at(-1) }, intermediates: stops.slice(1, -1).map(address => ({ address })), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE' }) })
    if (!routeResponse.ok) throw new Error(await routeResponse.text())
    const route = (await routeResponse.json()).routes?.[0]
    response.json({ mode: 'google', stops, distance: `${Math.round(route.distanceMeters / 1000)} km`, duration: route.duration?.replace('s', ' sec'), polyline: route.polyline?.encodedPolyline, mapsUrl })
  } catch (error) {
    response.status(502).json({ error: `Maps service unavailable: ${error.message}` })
  }
})
app.get('/api/trips', async (_request, response) => {
  if (!pool) return response.json([])
  try {
    const result = await pool.query('select id, title, location, start_date, end_date, note, mood from trips order by start_date desc')
    response.json(result.rows)
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})
app.post('/api/trips', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'Set DATABASE_URL to enable trip storage.' })
  const { title, location, start_date, end_date, note = '', mood = 'sunny' } = request.body
  if (!title || !location || !start_date || !end_date) return response.status(400).json({ error: 'Title, location, and dates are required.' })
  try {
    const result = await pool.query('insert into trips (title, location, start_date, end_date, note, mood) values ($1, $2, $3, $4, $5, $6) returning id, title, location, start_date, end_date, note, mood', [title, location, start_date, end_date, note, mood])
    response.status(201).json(result.rows[0])
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})
app.post('/api/setup', async (_request, response) => {
  if (!pool) return response.status(503).json({ error: 'Set DATABASE_URL first.' })
  try {
    await pool.query('create table if not exists trips (id serial primary key, title text not null, location text not null, start_date date not null, end_date date not null, note text default \'\', mood text default \'sunny\', created_at timestamptz default now())')
    response.json({ ready: true })
  } catch (error) {
    response.status(500).json({ error: error.message })
  }
})
app.get('/api/status', async (_request, response) => {
  if (!pool) return response.json({ connected: false, mode: 'demo' })
  try {
    const result = await pool.query('select version(), now() as checked_at')
    response.json({ connected: true, version: result.rows[0].version, checkedAt: result.rows[0].checked_at })
  } catch (error) {
    response.status(503).json({ connected: false, error: error.message })
  }
})
app.post('/api/query', async (request, response) => {
  if (!pool) return response.status(503).json({ error: 'Set DATABASE_URL to enable live queries.' })
  try {
    const result = await pool.query(request.body.sql)
    response.json({ rows: result.rows, rowCount: result.rowCount })
  } catch (error) {
    response.status(400).json({ error: error.message })
  }
})
app.use(express.static(path.join(root, 'dist')))
const schemaSql = 'create table if not exists trips (id serial primary key, title text not null, location text not null, start_date date not null, end_date date not null, note text default \'\', mood text default \'sunny\', created_at timestamptz default now())'
if (pool) pool.query(schemaSql).catch(error => console.error(`Could not initialize trips table: ${error.message}`))
app.listen(port, () => console.log(`TripTrail server running at http://localhost:${port}`))
