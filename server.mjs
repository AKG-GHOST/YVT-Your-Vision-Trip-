import 'dotenv/config'
import express from 'express'
import pg from 'pg'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const { Pool } = pg
const app = express()
const port = process.env.PORT || 8787
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : null
const root = path.dirname(fileURLToPath(import.meta.url))

app.use(express.json())

// ── AI Route Planner ──────────────────────────────────────────────
app.post('/api/ai/route', async (req, res) => {
  const prompt = String(req.body.prompt || '').trim()
  if (!prompt) return res.status(400).json({ error: 'Tell me where you want to go.' })

  let stops = prompt
    .split(/\s*(?:->|→|,|\band then\b|\bthen\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8)

  if (process.env.OPENAI_API_KEY) {
    try {
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Extract a driving itinerary from the user request. Return JSON only in the shape {"stops":["place 1","place 2"]}. Keep at most 8 stops.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      })
      const aiData = await aiRes.json()
      stops = JSON.parse(aiData.choices?.[0]?.message?.content || '{}').stops || stops
    } catch (err) {
      console.error(`AI fallback: ${err.message}`)
    }
  }

  if (stops.length < 2) stops = ['Bengaluru', 'Mysuru', 'Coorg']

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stops[0])}&destination=${encodeURIComponent(stops.at(-1))}&waypoints=${encodeURIComponent(stops.slice(1, -1).join('|'))}`

  if (!process.env.GOOGLE_MAPS_API_KEY)
    return res.json({
      mode: 'demo',
      stops,
      distance: '312 km',
      duration: '6 hr 48 min',
      mapsUrl,
      message: 'Add GOOGLE_MAPS_API_KEY for live routing.',
    })

  try {
    const routeRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { address: stops[0] },
        destination: { address: stops.at(-1) },
        intermediates: stops.slice(1, -1).map((address) => ({ address })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    })
    if (!routeRes.ok) throw new Error(await routeRes.text())
    const route = (await routeRes.json()).routes?.[0]
    res.json({
      mode: 'google',
      stops,
      distance: `${Math.round(route.distanceMeters / 1000)} km`,
      duration: route.duration?.replace('s', ' sec'),
      polyline: route.polyline?.encodedPolyline,
      mapsUrl,
    })
  } catch (err) {
    res.status(502).json({ error: `Maps service unavailable: ${err.message}` })
  }
})

// ── Trips CRUD ────────────────────────────────────────────────────
app.get('/api/trips', async (_req, res) => {
  if (!pool) return res.json([])
  try {
    const result = await pool.query(
      'SELECT id, title, location, start_date, end_date, note, mood FROM trips ORDER BY start_date DESC'
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/trips', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Set DATABASE_URL to enable trip storage.' })
  const { title, location, start_date, end_date, note = '', mood = 'sunny' } = req.body
  if (!title || !location || !start_date || !end_date)
    return res.status(400).json({ error: 'Title, location, and dates are required.' })
  try {
    const result = await pool.query(
      'INSERT INTO trips (title, location, start_date, end_date, note, mood) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title, location, start_date, end_date, note, mood]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/trips/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Set DATABASE_URL to enable trip storage.' })
  try {
    await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id])
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Health & Status ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/status', async (_req, res) => {
  if (!pool) return res.json({ connected: false, mode: 'demo' })
  try {
    const result = await pool.query('SELECT version(), now() AS checked_at')
    res.json({ connected: true, version: result.rows[0].version, checkedAt: result.rows[0].checked_at })
  } catch (err) {
    res.status(503).json({ connected: false, error: err.message })
  }
})

// ── Raw query (dev only) ─────────────────────────────────────────
app.post('/api/query', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Set DATABASE_URL to enable live queries.' })
  try {
    const result = await pool.query(req.body.sql)
    res.json({ rows: result.rows, rowCount: result.rowCount })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── Serve static frontend ────────────────────────────────────────
app.use(express.static(path.join(root, 'dist')))
app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))

// ── Auto-create schema ───────────────────────────────────────────
const schemaSql = `CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  note TEXT DEFAULT '',
  mood TEXT DEFAULT 'sunny',
  created_at TIMESTAMPTZ DEFAULT NOW()
)`
if (pool) pool.query(schemaSql).catch((err) => console.error(`Schema init failed: ${err.message}`))

app.listen(port, () => console.log(`TripTrail server running at http://localhost:${port}`))
