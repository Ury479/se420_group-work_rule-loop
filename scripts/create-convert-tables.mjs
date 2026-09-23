// 一次性建表脚本:消费价值换算 spend_conversions + conversion_preferences
// 同时给 spending_anchors 补齐目录字段(币种/计费类型/最小单位价格/区间上限/排序/来源备注)
// 运行:node --env-file-if-exists=/vercel/share/.env.project scripts/create-convert-tables.mjs
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const run = async (text) => (await pool.query(text)).rows

// 1. 目录表扩展(幂等)
await run(`
  ALTER TABLE spending_anchors
    ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'single_unit',
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CNY',
    ADD COLUMN IF NOT EXISTS price_minor INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_price_minor INTEGER,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source_note TEXT
`)

// 存量行:price_minor 由整数元价格回填,保证换算路径统一
await run(`UPDATE spending_anchors SET price_minor = price_cny * 100 WHERE price_minor = 0`)

await run(`CREATE INDEX IF NOT EXISTS spending_anchors_user_enabled_idx ON spending_anchors ("userId", is_active, sort_order)`)

// 2. 换算记录表
await run(`
  CREATE TABLE IF NOT EXISTS spend_conversions (
    id SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    event_case_id INTEGER,
    rule_id INTEGER,
    decision_stage TEXT NOT NULL,
    privacy_label TEXT NOT NULL DEFAULT '私密消费',
    sensitive_label TEXT,
    input_currency TEXT NOT NULL DEFAULT 'CNY',
    planned_amount_minor INTEGER NOT NULL,
    input_to_cny_rate TEXT NOT NULL DEFAULT '1.000000',
    snapshot_json TEXT NOT NULL,
    cooldown_minutes INTEGER,
    cooldown_ends_at TIMESTAMPTZ,
    minimum_action TEXT,
    resolution TEXT,
    actual_amount_minor INTEGER,
    protected_amount_minor INTEGER NOT NULL DEFAULT 0,
    redirected_amount_minor INTEGER NOT NULL DEFAULT 0,
    redirect_target TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

await run(`CREATE INDEX IF NOT EXISTS spend_conversions_user_created_idx ON spend_conversions ("userId", created_at DESC)`)
await run(`CREATE INDEX IF NOT EXISTS spend_conversions_user_resolution_idx ON spend_conversions ("userId", resolution, resolved_at)`)
await run(`CREATE INDEX IF NOT EXISTS spend_conversions_event_idx ON spend_conversions (event_case_id)`)
await run(`CREATE INDEX IF NOT EXISTS spend_conversions_rule_idx ON spend_conversions (rule_id)`)

// 3. 换算偏好表(单用户一行)
await run(`
  CREATE TABLE IF NOT EXISTS conversion_preferences (
    id SERIAL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    usd_to_cny_rate TEXT NOT NULL DEFAULT '7.000000',
    default_cooldown_minutes INTEGER NOT NULL DEFAULT 120,
    high_impact_threshold_minor INTEGER NOT NULL DEFAULT 100000,
    default_catalog_item_ids_json TEXT NOT NULL DEFAULT '[]',
    privacy_mode TEXT NOT NULL DEFAULT 'neutral',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT conversion_preferences_user_unique UNIQUE ("userId")
  )
`)

const tables = await run(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('spend_conversions', 'conversion_preferences')
`)
const columns = await run(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'spending_anchors' AND column_name IN ('billing_type','currency','price_minor','max_price_minor','sort_order','source_note')
`)
console.log("[v0] tables:", tables.map((t) => t.table_name))
console.log("[v0] anchor columns:", columns.map((c) => c.column_name))
await pool.end()
