import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import Database from 'better-sqlite3'

const { Pool, types } = pg
const root = path.dirname(fileURLToPath(import.meta.url))

// Ensure PostgreSQL DATE (type 1082) is returned as 'YYYY-MM-DD' string to match application models
types.setTypeParser(1082, (val) => val)

const isVercel = Boolean(process.env.VERCEL)
const isProduction = process.env.NODE_ENV === 'production' || isVercel
let rawDatabaseUrl = (process.env.DATABASE_URL || '').trim()

// Normalize postgres:// to postgresql://
if (rawDatabaseUrl.startsWith('postgres://')) {
  rawDatabaseUrl = rawDatabaseUrl.replace('postgres://', 'postgresql://')
}

let pool = null
let sqliteDb = null
let dbType = 'postgres' // Default expected target is PostgreSQL
let dbFilePath = ''
let configError = null

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
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    })

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Client Error]', err.message)
    })

    dbType = 'postgres'
    console.log(`[TripTrail DB] Initialized PostgreSQL connection pool (SSL: ${useSsl})`)
  } catch (err) {
    configError = `Failed to initialize PostgreSQL pool: ${err.message}`
    console.error(`[TripTrail DB] ${configError}`)
    pool = null
  }
} else if (isProduction) {
  // STRICT RULE: In production/Vercel, NEVER silently fall back to temporary /tmp SQLite!
  configError = 'DATABASE_URL environment variable is missing in production. PostgreSQL connection string is required for persistent storage.'
  console.error(`[TripTrail DB ERROR] ${configError}`)
  pool = null
} else {
  // Local offline development fallback only (when not in production/Vercel)
  try {
    const dbDir = path.join(root, 'data')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    dbFilePath = path.join(dbDir, 'triptrail.db')
    sqliteDb = new Database(dbFilePath)
    sqliteDb.pragma('journal_mode = WAL')
    sqliteDb.pragma('foreign_keys = ON')
    dbType = 'sqlite'
    console.log(`[TripTrail DB] Local development mode: Using SQLite at ${dbFilePath}`)
  } catch (err) {
    configError = `Failed to initialize local SQLite database: ${err.message}`
    console.error(`[TripTrail DB] ${configError}`)
  }
}

let schemaInitialized = false
let schemaInitPromise = null

/**
 * Initialize Tables, Columns, and Indexes for PostgreSQL or SQLite
 */
export async function initSchema() {
  if (schemaInitialized) return

  if (!pool && !sqliteDb) {
    if (isProduction) {
      const err = new Error(configError || 'Cannot initialize database schema: DATABASE_URL is missing.')
      err.status = 503
      throw err
    }
    return
  }

  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      if (pool) {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')

          // 1. Users table
          await client.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              name TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );
          `)

          // 2. Trips table (foreign key to users)
          await client.query(`
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
          `)

          // 3. Wishlists table (foreign key to users)
          await client.query(`
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
          `)

          // 4. Safe column migrations for existing tables
          await client.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'trips' AND column_name = 'user_email'
              ) THEN
                ALTER TABLE trips ADD COLUMN user_email TEXT;
              END IF;
              
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'wishlists' AND column_name = 'user_email'
              ) THEN
                ALTER TABLE wishlists ADD COLUMN user_email TEXT;
              END IF;
            END $$;
          `)

          // 5. Query and data isolation indexes
          await client.query(`CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);`)
          await client.query(`CREATE INDEX IF NOT EXISTS idx_trips_email ON trips(LOWER(user_email));`)
          await client.query(`CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);`)
          await client.query(`CREATE INDEX IF NOT EXISTS idx_wishlists_email ON wishlists(LOWER(user_email));`)
          await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));`)

          await client.query('COMMIT')
          schemaInitialized = true
          console.log('[TripTrail DB] PostgreSQL schema & indexes successfully verified.')
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {})
          console.error('[TripTrail DB] Schema initialization error:', err.message)
          throw err
        } finally {
          client.release()
        }
        return
      }

      // Local development SQLite schema
      if (sqliteDb) {
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

        try { sqliteDb.exec('ALTER TABLE trips ADD COLUMN user_email TEXT;') } catch (_) {}
        try { sqliteDb.exec('ALTER TABLE wishlists ADD COLUMN user_email TEXT;') } catch (_) {}

        schemaInitialized = true
        console.log('[TripTrail DB] Local SQLite schema verified successfully.')
      }
    })().catch((err) => {
      schemaInitPromise = null
      throw err
    })
  }

  return schemaInitPromise
}

/**
 * Execute parameterized query with automatic schema initialization
 */
export async function query(sql, params = []) {
  if (!schemaInitialized) {
    await initSchema()
  }

  if (pool) {
    try {
      const res = await pool.query(sql, params)
      return { rows: res.rows, rowCount: res.rowCount }
    } catch (err) {
      console.error('[PostgreSQL Query Error]', err.message)
      throw err
    }
  }

  // If in production and no pool, fail clearly
  if (isProduction) {
    const err = new Error(
      configError || 'Database not connected. Please configure DATABASE_URL in your Vercel project settings.'
    )
    err.status = 503
    err.code = 'DATABASE_UNCONFIGURED'
    throw err
  }

  // Local development SQLite execution
  if (sqliteDb) {
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

  const err = new Error(configError || 'Database client unavailable.')
  err.status = 503
  throw err
}

/**
 * Live Database Health & Diagnostics
 */
export async function getDbHealth() {
  const startTime = Date.now()

  if (pool) {
    try {
      // 1. Ensure schema is initialized before executing diagnostics
      await initSchema()

      // 2. Query safe metadata: database name, current schema, current user (no secrets)
      const metaRes = await pool.query(`
        SELECT 
          current_database() as database_name,
          current_schema() as current_schema,
          current_user as current_user
      `)
      const meta = metaRes.rows[0] || {}

      // 3. Inspect existing tables in non-system schemas
      const tablesRes = await pool.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
      `)
      const tables = tablesRes.rows.map((r) => `${r.table_schema}.${r.table_name}`)

      // 4. Query live counts
      const userRes = await pool.query('SELECT COUNT(*)::int as count FROM users')
      const tripRes = await pool.query('SELECT COUNT(*)::int as count FROM trips')
      const wishRes = await pool.query('SELECT COUNT(*)::int as count FROM wishlists')
      const latencyMs = Date.now() - startTime

      return {
        status: 'healthy',
        database: 'PostgreSQL',
        persistent: true,
        connected: true,
        latencyMs,
        databaseName: meta.database_name,
        currentSchema: meta.current_schema,
        tables,
        userCount: userRes.rows[0]?.count || 0,
        tripCount: tripRes.rows[0]?.count || 0,
        wishlistCount: wishRes.rows[0]?.count || 0,
        isVercel,
        message: 'Connected to production Neon PostgreSQL database. All tables, foreign keys, and indexes are verified and persistent.',
      }
    } catch (err) {
      return {
        status: 'unreachable',
        database: 'PostgreSQL',
        persistent: true,
        connected: false,
        latencyMs: Date.now() - startTime,
        error: err.message,
        message: 'PostgreSQL error: ' + err.message,
        isVercel,
      }
    }
  }

  if (isProduction) {
    return {
      status: 'unconfigured',
      database: 'PostgreSQL (Required)',
      persistent: false,
      connected: false,
      isVercel,
      error: configError || 'DATABASE_URL is missing.',
      message: 'CRITICAL: DATABASE_URL environment variable is not configured in Vercel. Database operations are halted to protect data persistence.',
      actionRequired: 'Add DATABASE_URL in Vercel Project Settings -> Environment Variables and redeploy.',
    }
  }

  // Local development SQLite info
  try {
    await initSchema()
    const userRow = sqliteDb ? sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get() : { count: 0 }
    const tripRow = sqliteDb ? sqliteDb.prepare('SELECT COUNT(*) as count FROM trips').get() : { count: 0 }
    const wishRow = sqliteDb ? sqliteDb.prepare('SELECT COUNT(*) as count FROM wishlists').get() : { count: 0 }
    return {
      status: 'healthy_local_dev',
      database: 'SQLite',
      persistent: true,
      connected: true,
      latencyMs: Date.now() - startTime,
      userCount: userRow?.count || 0,
      tripCount: tripRow?.count || 0,
      wishlistCount: wishRow?.count || 0,
      file: dbFilePath,
      isVercel: false,
      message: 'Running local SQLite for offline development. Set DATABASE_URL to connect to PostgreSQL locally.',
    }
  } catch (err) {
    return {
      status: 'error',
      database: 'SQLite',
      connected: false,
      error: err.message,
    }
  }
}

export function getDbInfo() {
  return {
    type: dbType,
    connected: Boolean(pool || sqliteDb),
    storage: pool ? 'PostgreSQL Cloud' : isProduction ? 'Unconfigured' : 'SQLite Local Dev',
  }
}
