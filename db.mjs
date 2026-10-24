import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import Database from 'better-sqlite3'

const { Pool } = pg
const root = path.dirname(fileURLToPath(import.meta.url))

let pool = null
let sqliteDb = null
let dbType = 'sqlite'
let dbFilePath = ''

const databaseUrl = process.env.DATABASE_URL?.trim()

if (databaseUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
    dbType = 'postgres'
    console.log('[TripTrail DB] Configured for PostgreSQL')
  } catch (err) {
    console.error('[TripTrail DB] Failed to initialize PostgreSQL pool, falling back to SQLite:', err.message)
    pool = null
    dbType = 'sqlite'
  }
}

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
  console.log(`[TripTrail DB] Using persistent SQLite database at: ${dbFilePath}`)
}

/**
 * Execute parameterized query for both PostgreSQL ($1, $2) and SQLite (?, ?)
 */
export async function query(sql, params = []) {
  if (pool) {
    // PostgreSQL
    const res = await pool.query(sql, params)
    return { rows: res.rows, rowCount: res.rowCount }
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

export function getDbInfo() {
  return {
    type: dbType,
    connected: true,
    file: dbType === 'sqlite' ? dbFilePath || 'data/triptrail.db' : 'PostgreSQL Cloud',
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
