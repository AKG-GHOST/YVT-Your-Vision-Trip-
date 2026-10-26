import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import Database from 'better-sqlite3'

const { Pool, types } = pg
const root = path.dirname(fileURLToPath(import.meta.url))

// Ensure PostgreSQL DATE (type 1082) is returned as 'YYYY-MM-DD' string to match SQLite format
types.setTypeParser(1082, (val) => val)

let pool = null
let sqliteDb = null
let dbType = 'sqlite'
let dbFilePath = ''
let poolInitError = null

let rawDatabaseUrl = (process.env.DATABASE_URL || '').trim()

// Normalize postgres:// to postgresql:// if needed
if (rawDatabaseUrl.startsWith('postgres://')) {
  rawDatabaseUrl = rawDatabaseUrl.replace('postgres://', 'postgresql://')
}

if (rawDatabaseUrl) {
  try {
    const isLocalhost = rawDatabaseUrl.includes('localhost') || rawDatabaseUrl.includes('127.0.0.1')
    // Automatically enable SSL for all remote/cloud PostgreSQL hosts (Neon, Supabase, Render, AWS, Railway)
    const useSsl =
      process.env.DATABASE_SSL === 'true' ||
      (!isLocalhost && process.env.DATABASE_SSL !== 'false')

    pool = new Pool({
      connectionString: rawDatabaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
      console.error('[TripTrail DB Pool Error]', err.message)
    })

    dbType = 'postgres'
    console.log(`[TripTrail DB] Configured for PostgreSQL (SSL: ${useSsl})`)
  } catch (err) {
    console.error('[TripTrail DB] Failed to create PostgreSQL pool:', err.message)
    pool = null
    poolInitError = err.message
    dbType = 'sqlite'
  }
}

// Fallback to SQLite (local file or serverless /tmp)
if (!pool) {
  const isVercel = Boolean(process.env.VERCEL)
  const dbDir = isVercel ? '/tmp' : path.join(root, 'data')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  dbFilePath = path.join(dbDir, 'triptrail.db')
  sqliteDb = new Database(dbFilePath)
  sqliteDb.pragma('journal_mode = WAL')
  sqliteDb.pragma('foreign_keys = ON')
  dbType = 'sqlite'
  console.log(`[TripTrail DB] Using SQLite database at: ${dbFilePath} (Persistent: ${!isVercel})`)
}

/**
 * Execute parameterized query for both PostgreSQL ($1, $2) and SQLite (?, ?)
 */
export async function query(sql, params = []) {
  if (pool) {
    try {
      const res = await pool.query(sql, params)
      return { rows: res.rows, rowCount: res.rowCount }
    } catch (err) {
      console.error('[PostgreSQL Query Error]', err.message)
      throw err
    }
  }

  // SQLite: convert $1, $2... to ?
  const sqliteSql = sql.replace(/\$(\d+)/g, '?')
  const trimmed = sqliteSql.trim().toUpperCase()

  if (trimmed.startsWith('SELECT')) {
    const rows = sqliteDb.prepare(sqliteSql).all(...params)
    return { rows, rowCount: rows.length }
  }

  if (sqliteSql.toUpperCase().includes('RETURNING')) {
    const rows = sqliteDb.prepare(sqliteSql).all(...params)
    return { rows, rowCount: rows.length }
  }

  const info = sqliteDb.prepare(sqliteSql).run(...params)
  return { rows: [], rowCount: info.changes }
}

/**
 * Health check with live query execution and persistence verification
 */
export async function getDbHealth() {
  const isVercel = Boolean(process.env.VERCEL)
  const hasDbUrl = Boolean(rawDatabaseUrl)
  const startTime = Date.now()

  if (pool) {
    try {
      const pingRes = await pool.query('SELECT NOW() as now')
      const userRes = await pool.query('SELECT COUNT(*)::int as count FROM users')
      const tripRes = await pool.query('SELECT COUNT(*)::int as count FROM trips')
      const latencyMs = Date.now() - startTime

      return {
        status: 'healthy',
        database: 'PostgreSQL',
        persistent: true,
        latencyMs,
        userCount: userRes.rows[0]?.count || 0,
        tripCount: tripRes.rows[0]?.count || 0,
        serverTime: pingRes.rows[0]?.now,
        isVercel,
      }
    } catch (err) {
      return {
        status: 'unreachable',
        database: 'PostgreSQL',
        persistent: true,
        error: err.message,
        message: 'PostgreSQL connection failed. Verify DATABASE_URL credentials and SSL in Vercel.',
        isVercel,
      }
    }
  }

  // SQLite mode
  try {
    const userRow = sqliteDb ? sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() : { count: 0 }
    const tripRow = sqliteDb ? sqliteDb.prepare('SELECT COUNT(*) as count FROM trips').get() : { count: 0 }
    const latencyMs = Date.now() - startTime

    return {
      status: isVercel ? 'warning_ephemeral' : 'healthy_local',
      database: 'SQLite',
      persistent: !isVercel,
      latencyMs,
      userCount: userRow?.count || 0,
      tripCount: tripRow?.count || 0,
      hasDatabaseUrlEnv: hasDbUrl,
      poolInitError: poolInitError || undefined,
      isVercel,
      warning: isVercel
        ? 'Running on ephemeral /tmp SQLite inside Vercel Serverless Function. Data will reset on cold starts. Add DATABASE_URL in Vercel project settings to persist permanently.'
        : undefined,
    }
  } catch (err) {
    return {
      status: 'error',
      database: 'SQLite',
      error: err.message,
      isVercel,
    }
  }
}

export function getDbInfo() {
  return {
    type: dbType,
    connected: true,
    storage: dbType === 'sqlite' ? 'SQLite (Local)' : 'PostgreSQL Cloud',
  }
}

let schemaInitialized = false

/**
 * Initialize Tables
 */
export async function initSchema() {
  if (schemaInitialized) return
  if (pool) {
    // PostgreSQL schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        note TEXT DEFAULT '',
        mood TEXT DEFAULT 'sunny',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wishlists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        season TEXT DEFAULT 'Anytime',
        vibe TEXT DEFAULT 'Curated',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
      CREATE INDEX IF NOT EXISTS idx_trips_email ON trips(user_email);
      CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
      CREATE INDEX IF NOT EXISTS idx_wishlists_email ON wishlists(user_email);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
    `)

    // Safe column migrations if tables existed previously
    try {
      await pool.query('ALTER TABLE trips ADD COLUMN IF NOT EXISTS user_email TEXT;')
      await pool.query('ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS user_email TEXT;')
    } catch (_) {}
  } else {
    // SQLite schema
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        note TEXT DEFAULT '',
        mood TEXT DEFAULT 'sunny',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wishlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_email TEXT,
        title TEXT NOT NULL,
        location TEXT NOT NULL,
        season TEXT DEFAULT 'Anytime',
        vibe TEXT DEFAULT 'Curated',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
      CREATE INDEX IF NOT EXISTS idx_trips_email ON trips(user_email);
      CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
      CREATE INDEX IF NOT EXISTS idx_wishlists_email ON wishlists(user_email);
    `)

    // Safe column migrations if tables existed previously in SQLite
    try {
      sqliteDb.exec('ALTER TABLE trips ADD COLUMN user_email TEXT;')
    } catch (_) {}
    try {
      sqliteDb.exec('ALTER TABLE wishlists ADD COLUMN user_email TEXT;')
    } catch (_) {}
  }
  schemaInitialized = true
  console.log('[TripTrail DB] Schema initialized successfully.')
}
