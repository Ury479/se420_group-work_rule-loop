// 一次性迁移:event_cases 补充影响等级与是否重复两列(成长档案 / 记录事件表单用)
// 运行:node --env-file-if-exists=/vercel/share/.env.project scripts/add-event-impact-columns.mjs
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`
  ALTER TABLE event_cases
    ADD COLUMN IF NOT EXISTS impact_level TEXT NOT NULL DEFAULT 'low',
    ADD COLUMN IF NOT EXISTS is_repeat BOOLEAN NOT NULL DEFAULT false
`)

// 存量数据回填:有明显损失(金额或超过 30 分钟寻找)的历史事件视为高影响
await pool.query(`
  UPDATE event_cases
  SET impact_level = 'high'
  WHERE impact_level = 'low' AND (money_loss >= 100 OR search_minutes >= 30)
`)

const { rows } = await pool.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'event_cases' AND column_name IN ('impact_level','is_repeat')`,
)
console.log(
  "[v0] event_cases 新列:",
  rows.map((r) => r.column_name),
)
await pool.end()
