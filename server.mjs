import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, initSchema, getDbInfo } from './db.mjs'

const app = express()
const port = process.env.PORT || 8787
const root = path.dirname(fileURLToPath(import.meta.url))
const JWT_SECRET = process.env.JWT_SECRET || 'triptrail-super-secret-jwt-key-2026'

app.use(express.json())
app.use(cookieParser())

// ── Auth Middleware ──────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token =
      req.cookies?.token ||
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null)

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const { rows } = await query('SELECT id, name, email, created_at FROM users WHERE id = $1', [decoded.id])

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'User session expired or user no longer exists.' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
  }
}

// ── Auth Routes ───────────────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail])
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const insertRes = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name.trim(), normalizedEmail, passwordHash]
    )
    const user = insertRes.rows[0]

    // Create token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    })

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error('[Register Error]', err)
    res.status(500).json({ error: 'Failed to create account: ' + err.message })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail])

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '14d' })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    })

    res.json({
      message: 'Signed in successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (err) {
    console.error('[Login Error]', err)
    res.status(500).json({ error: 'Authentication failed: ' + err.message })
  }
})

// Current user session check
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// Logout
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Signed out successfully.' })
})

// Update profile / password
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body
    const userId = req.user.id

    if (name && name.trim().length >= 2) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), userId])
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' })
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' })
      }

      const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId])
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
      if (!match) {
        return res.status(401).json({ error: 'Current password incorrect.' })
      }

      const newHash = await bcrypt.hash(newPassword, 10)
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId])
    }

    const updated = await query('SELECT id, name, email FROM users WHERE id = $1', [userId])
    res.json({ message: 'Profile updated', user: updated.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed: ' + err.message })
  }
})

// ── User Trips CRUD (User Isolated) ──────────────────────────────
app.get('/api/trips', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, location, start_date, end_date, note, mood, created_at FROM trips WHERE user_id = $1 ORDER BY start_date DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/trips', requireAuth, async (req, res) => {
  const { title, location, start_date, end_date, note = '', mood = 'sunny' } = req.body
  if (!title || !location || !start_date || !end_date) {
    return res.status(400).json({ error: 'Title, location, and dates are required.' })
  }
  try {
    const result = await query(
      'INSERT INTO trips (user_id, title, location, start_date, end_date, note, mood) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, location, start_date, end_date, note, mood, created_at',
      [req.user.id, title.trim(), location.trim(), start_date, end_date, note.trim(), mood]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/trips/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('DELETE FROM trips WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Trip not found or unauthorized.' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── User Wishlists CRUD (User Isolated) ───────────────────────────
app.get('/api/wishlists', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, location, season, vibe, created_at FROM wishlists WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/wishlists', requireAuth, async (req, res) => {
  const { title, location, season = 'Anytime', vibe = 'Curated' } = req.body
  if (!title || !location) {
    return res.status(400).json({ error: 'Title and location are required.' })
  }
  try {
    const result = await query(
      'INSERT INTO wishlists (user_id, title, location, season, vibe) VALUES ($1,$2,$3,$4,$5) RETURNING id, title, location, season, vibe, created_at',
      [req.user.id, title.trim(), location.trim(), season.trim(), vibe.trim()]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/wishlists/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('DELETE FROM wishlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Wishlist item not found or unauthorized.' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.json({
      mode: 'demo',
      stops,
      distance: '312 km',
      duration: '6 hr 48 min',
      mapsUrl,
      message: 'Add GOOGLE_MAPS_API_KEY for live routing.',
    })
  }

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

// ── Health & Diagnostics ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

app.get('/api/status', async (_req, res) => {
  const dbInfo = getDbInfo()
  res.json({
    connected: true,
    db: dbInfo,
    serverTime: new Date().toISOString(),
  })
})

// ── Serve Static Frontend ─────────────────────────────────────────
app.use(express.static(path.join(root, 'dist')))
app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))

// ── Initialize Schema & Start ─────────────────────────────────────
initSchema()
  .then(() => {
    app.listen(port, () => console.log(`[TripTrail] Server running at http://localhost:${port}`))
  })
  .catch((err) => {
    console.error('[TripTrail] Failed to start database schema:', err)
  })
