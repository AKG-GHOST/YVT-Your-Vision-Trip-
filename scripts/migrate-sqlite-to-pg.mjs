import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import pg from 'pg'

const { Pool } = pg
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const sqlitePath = path.join(root, 'data', 'triptrail.db')
const databaseUrl = (process.env.DATABASE_URL || '').trim()

console.log('──────────────────────────────────────────────────')
console.log(' TripTrail Database Migration: SQLite → PostgreSQL')
console.log('──────────────────────────────────────────────────')

if (!fs.existsSync(sqlitePath)) {
  console.log(`[INFO] No local SQLite database found at ${sqlitePath}. Nothing to migrate.`)
  process.exit(0)
}

if (!databaseUrl) {
  console.error('[ERROR] DATABASE_URL environment variable is required to migrate to PostgreSQL.')
  console.error('Example: DATABASE_URL=postgresql://user:pass@host:5432/db node scripts/migrate-sqlite-to-pg.mjs')
  process.exit(1)
}

const sqliteDb = new Database(sqlitePath, { readonly: true })
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: !isLocalhost ? { rejectUnauthorized: false } : undefined,
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('[1/4] Ensuring PostgreSQL schema exists...')
    await client.query(`
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
    `)

    // 1. Migrate Users
    console.log('[2/4] Migrating users...')
    const sqliteUsers = sqliteDb.prepare('SELECT * FROM users').all()
    let usersMigrated = 0
    const userIdMap = new Map() // sqlite ID -> pg ID

    for (const u of sqliteUsers) {
      const email = u.email.trim().toLowerCase()
      const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email])
      if (existing.rows.length > 0) {
        userIdMap.set(u.id, existing.rows[0].id)
      } else {
        const ins = await client.query(
          'INSERT INTO users (name, email, password_hash, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
          [u.name, email, u.password_hash, u.created_at || new Date().toISOString()]
        )
        userIdMap.set(u.id, ins.rows[0].id)
        usersMigrated++
      }
    }
    console.log(`  ✓ ${usersMigrated} new users migrated (${sqliteUsers.length} total in SQLite).`)

    // 2. Migrate Trips
    console.log('[3/4] Migrating trips...')
    const sqliteTrips = sqliteDb.prepare('SELECT * FROM trips').all()
    let tripsMigrated = 0

    for (const t of sqliteTrips) {
      const pgUserId = userIdMap.get(t.user_id)
      if (!pgUserId) continue

      const userEmail = t.user_email || sqliteUsers.find((u) => u.id === t.user_id)?.email || ''
      await client.query(
        'INSERT INTO trips (user_id, user_email, title, location, start_date, end_date, note, mood, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          pgUserId,
          userEmail.toLowerCase(),
          t.title,
          t.location,
          t.start_date,
          t.end_date,
          t.note || '',
          t.mood || 'sunny',
          t.created_at || new Date().toISOString(),
        ]
      )
      tripsMigrated++
    }
    console.log(`  ✓ ${tripsMigrated} trips migrated.`)

    // 3. Migrate Wishlists
    console.log('[4/4] Migrating wishlists...')
    let wishlistsMigrated = 0
    try {
      const sqliteWish = sqliteDb.prepare('SELECT * FROM wishlists').all()
      for (const w of sqliteWish) {
        const pgUserId = userIdMap.get(w.user_id)
        if (!pgUserId) continue
        const userEmail = w.user_email || sqliteUsers.find((u) => u.id === w.user_id)?.email || ''
        await client.query(
          'INSERT INTO wishlists (user_id, user_email, title, location, season, vibe, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            pgUserId,
            userEmail.toLowerCase(),
            w.title,
            w.location,
            w.season || 'Anytime',
            w.vibe || 'Curated',
            w.created_at || new Date().toISOString(),
          ]
        )
        wishlistsMigrated++
      }
      console.log(`  ✓ ${wishlistsMigrated} wishlists migrated.`)
    } catch (_) {
      console.log('  - No wishlists to migrate.')
    }

    console.log('──────────────────────────────────────────────────')
    console.log('✓ Migration to PostgreSQL completed successfully!')
    console.log('──────────────────────────────────────────────────')
  } finally {
    client.release()
    await pool.end()
    sqliteDb.close()
  }
}

migrate().catch((err) => {
  console.error('[MIGRATION ERROR]', err)
  process.exit(1)
})
