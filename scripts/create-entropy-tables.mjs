// 一次性建表脚本:熵减系统 rhythm_logs + lifespan_logs
// 运行:node --env-file-if-exists=/vercel/share/.env.project scripts/create-entropy-tables.mjs
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const sql = async (strings, ...values) => (await pool.query(strings.join("?"), values)).rows

await sql`
  CREATE TABLE IF NOT EXISTS rhythm_logs (
    id SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    date TEXT NOT NULL,
    sleep_time TEXT,
    wake_time TEXT,
    fatigue_level INTEGER,
    night_mode_used BOOLEAN NOT NULL DEFAULT FALSE,
    morning_mode_used BOOLEAN NOT NULL DEFAULT FALSE,
    quality_score INTEGER,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rhythm_logs_user_date_unique UNIQUE ("userId", date)
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS lifespan_logs (
    id SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    date TEXT NOT NULL,
    quality_score INTEGER NOT NULL DEFAULT 0,
    effective_days_x100 INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lifespan_logs_user_date_unique UNIQUE ("userId", date)
  )
`

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('rhythm_logs', 'lifespan_logs')
`
console.log(
  "[v0] created tables:",
  tables.map((t) => t.table_name),
)
await pool.end()
