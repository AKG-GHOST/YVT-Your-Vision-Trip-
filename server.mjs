import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, initSchema, getDbInfo, getDbHealth } from './db.mjs'

const app = express()
const port = process.env.PORT || 8787
const root = path.dirname(fileURLToPath(import.meta.url))
const JWT_SECRET = process.env.JWT_SECRET || 'triptrail-super-secret-jwt-key-2026'

if (!process.env.JWT_SECRET && (process.env.NODE_ENV === 'production' || process.env.VERCEL)) {
  console.warn(
    '[SECURITY WARNING] JWT_SECRET is not set in environment variables! Using default secret is insecure in production. Set JWT_SECRET in your Vercel project settings.'
  )
}

app.use(express.json())
app.use(cookieParser())

// Anti-caching middleware for all /api endpoints to prevent CDN/browser cache contamination
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  res.set('Surrogate-Control', 'no-store')
  next()
})

// Rate limiter for authentication endpoints (prevents brute-force / credential stuffing)
const authAttempts = new Map()
function authRateLimiter(maxAttempts = 20, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1'
    const now = Date.now()
    const entry = authAttempts.get(ip) || { count: 0, resetAt: now + windowMs }

    if (now > entry.resetAt) {
      entry.count = 0
      entry.resetAt = now + windowMs
    }

    entry.count++
    authAttempts.set(ip, entry)

    if (entry.count > maxAttempts) {
      return res.status(429).json({
        error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      })
    }

    next()
  }
}

// Ensure schema is initialized before handling data requests
app.use(async (req, _res, next) => {
  // Allow health and status endpoints to respond even if DB is not yet configured
  if (req.path === '/api/health' || req.path === '/api/status' || req.path === '/api/db/diagnostics') {
    return next()
  }

  try {
    await initSchema()
    next()
  } catch (err) {
    next(err)
  }
})

// ── Auth Middleware ──────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token =
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) ||
      req.cookies?.token ||
      null

    if (!token || token === 'guest-token' || token === 'undefined' || token === 'null') {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' })
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
      }
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
    }

    if (!decoded || (!decoded.id && !decoded.email)) {
      return res.status(401).json({ error: 'Malformed authentication session. Please sign in again.' })
    }

    // Always query primarily by email to prevent cross-container auto-increment ID collisions
    const userEmail = (decoded.email || '').trim().toLowerCase()
    let querySql = ''
    let queryParams = []

    if (userEmail) {
      querySql = 'SELECT id, name, email, created_at FROM users WHERE LOWER(email) = LOWER($1)'
      queryParams = [userEmail]
    } else {
      querySql = 'SELECT id, name, email, created_at FROM users WHERE id = $1'
      queryParams = [decoded.id]
    }

    const { rows } = await query(querySql, queryParams)

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Account session expired or not found. Please sign in again.' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    console.error('[requireAuth Error]', err.message)
    return res.status(401).json({ error: 'Authentication verification failed. Please sign in again.' })
  }
}

// ── Auth Routes ───────────────────────────────────────────────────

// Register
app.post('/api/auth/register', authRateLimiter(20, 15 * 60 * 1000), async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters long.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail])
    if (existing.rows && existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const insertRes = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name.trim(), normalizedEmail, passwordHash]
    )
    const user = insertRes.rows[0]

    // Create token containing both id and email
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
    res.status(500).json({ error: 'Failed to create account. Please try again later.' })
  }
})

// Login
app.post('/api/auth/login', authRateLimiter(20, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' })
    }

    if (!password || String(password).length === 0) {
      return res.status(400).json({ error: 'Password is required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const { rows } = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail])

    if (!rows || rows.length === 0) {
      // Meaningful 404 error when account does not exist
      return res.status(404).json({
        error: 'No account found with this email. Please check your email or click Create Account.',
      })
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      // Meaningful 401 error when password is wrong
      return res.status(401).json({
        error: 'Incorrect password. Please verify your password and try again.',
      })
    }

    // Token includes both ID and email
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
    res.status(500).json({ error: 'Database service is temporarily unavailable. Please try again shortly.' })
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
    const userEmail = req.user.email.toLowerCase()

    if (name && name.trim().length >= 2) {
      await query('UPDATE users SET name = $1 WHERE LOWER(email) = LOWER($2)', [name.trim(), userEmail])
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' })
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' })
      }

      const { rows } = await query('SELECT password_hash FROM users WHERE LOWER(email) = LOWER($1)', [userEmail])
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'User account not found.' })
      }
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash)
      if (!match) {
        return res.status(401).json({ error: 'Current password incorrect.' })
      }

      const newHash = await bcrypt.hash(newPassword, 10)
      await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2)', [newHash, userEmail])
    }

    const updated = await query('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)', [userEmail])
    res.json({ message: 'Profile updated', user: updated.rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed: ' + err.message })
  }
})

// ── User Trips CRUD (Strict User Isolation) ──────────────────────
app.get('/api/trips', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, location, start_date, end_date, note, mood, created_at FROM trips WHERE (user_email IS NOT NULL AND LOWER(user_email) = LOWER($1)) OR (user_email IS NULL AND user_id = $2) ORDER BY start_date DESC',
      [req.user.email, req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load trips: ' + err.message })
  }
})

app.post('/api/trips', requireAuth, async (req, res) => {
  const { title, location, start_date, end_date, note = '', mood = 'sunny' } = req.body
  if (!title || !location || !start_date || !end_date) {
    return res.status(400).json({ error: 'Title, location, and dates are required.' })
  }
  try {
    const result = await query(
      'INSERT INTO trips (user_id, user_email, title, location, start_date, end_date, note, mood) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, title, location, start_date, end_date, note, mood, created_at',
      [req.user.id, req.user.email.toLowerCase(), title.trim(), location.trim(), start_date, end_date, note.trim(), mood]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to save trip: ' + err.message })
  }
})

app.delete('/api/trips/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM trips WHERE id = $1 AND ((user_email IS NOT NULL AND LOWER(user_email) = LOWER($2)) OR (user_email IS NULL AND user_id = $3))',
      [req.params.id, req.user.email, req.user.id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Trip not found or unauthorized.' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete trip: ' + err.message })
  }
})

// ── User Wishlists CRUD (Strict User Isolation) ───────────────────
app.get('/api/wishlists', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, location, season, vibe, created_at FROM wishlists WHERE (user_email IS NOT NULL AND LOWER(user_email) = LOWER($1)) OR (user_email IS NULL AND user_id = $2) ORDER BY id DESC',
      [req.user.email, req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load wishlists: ' + err.message })
  }
})

app.post('/api/wishlists', requireAuth, async (req, res) => {
  const { title, location, season = 'Anytime', vibe = 'Curated' } = req.body
  if (!title || !location) {
    return res.status(400).json({ error: 'Title and location are required.' })
  }
  try {
    const result = await query(
      'INSERT INTO wishlists (user_id, user_email, title, location, season, vibe) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, title, location, season, vibe, created_at',
      [req.user.id, req.user.email.toLowerCase(), title.trim(), location.trim(), season.trim(), vibe.trim()]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Failed to save wishlist item: ' + err.message })
  }
})

app.delete('/api/wishlists/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM wishlists WHERE id = $1 AND ((user_email IS NOT NULL AND LOWER(user_email) = LOWER($2)) OR (user_email IS NULL AND user_id = $3))',
      [req.params.id, req.user.email, req.user.id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Wishlist item not found or unauthorized.' })
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete wishlist item: ' + err.message })
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
  const dbHealth = await getDbHealth()
  res.json({
    connected: Boolean(dbHealth.connected),
    db: dbHealth,
    serverTime: new Date().toISOString(),
  })
})

app.get('/api/db/diagnostics', async (_req, res) => {
  const dbHealth = await getDbHealth()
  res.json({
    timestamp: new Date().toISOString(),
    diagnostics: dbHealth,
    instructions: dbHealth.persistent
      ? 'Database is configured for persistent cloud storage.'
      : 'ACTION REQUIRED FOR PRODUCTION PERSISTENCE: In Vercel Project Settings -> Environment Variables, add DATABASE_URL (e.g. from Neon.tech or Supabase.com).'
  })
})

// Centralized API Error Handling Middleware
app.use((err, req, res, _next) => {
  console.error(`[Server Error] ${req.method} ${req.url}:`, err.message)
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected database error occurred.',
    path: req.url,
  })
})

// ── Serve Static Frontend (for standalone Node server) ───────────
app.use(express.static(path.join(root, 'dist')))
app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))

// ── Export App for Serverless / Vercel & Start Local Server ───────
export default app

// Only start listening if executed directly (e.g. node server.mjs)
if (!process.env.VERCEL) {
  initSchema()
    .then(() => {
      app.listen(port, () => console.log(`[TripTrail] Server running at http://localhost:${port}`))
    })
    .catch((err) => {
      console.error('[TripTrail] Failed to start database schema:', err)
    })
}
