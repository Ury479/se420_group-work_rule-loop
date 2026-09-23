// 清理重复目录项(同名只保留最小 id 的一行,其余软停用),并设置默认比较锚点
// 历史换算快照不受影响:快照保存的是当时的名称与价格副本
// 运行:node --env-file-if-exists=/vercel/share/.env.project scripts/dedupe-value-catalog.mjs
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const USER_ID = process.env.SEED_USER_ID ?? "default-user"

const dupes = await pool.query(
  `UPDATE spending_anchors a SET is_active = FALSE, updated_at = NOW()
   WHERE a."userId" = $1 AND a.is_active = TRUE
     AND EXISTS (
       SELECT 1 FROM spending_anchors b
       WHERE b."userId" = a."userId" AND b.name = a.name AND b.id < a.id
     )
   RETURNING a.id, a.name`,
  [USER_ID],
)
console.log("[v0] deactivated duplicates:", dupes.rows.length)

// 默认比较锚点:PRD 推荐的 3 个 AI 工具
const defaults = await pool.query(
  `SELECT id, name FROM spending_anchors
   WHERE "userId" = $1 AND is_active = TRUE AND name IN ('Cursor Pro', '豆包个人高阶版', 'GPT Pro')
   ORDER BY sort_order`,
  [USER_ID],
)
const ids = defaults.rows.map((r) => r.id)
await pool.query(
  `INSERT INTO conversion_preferences ("userId", default_catalog_item_ids_json)
   VALUES ($1, $2)
   ON CONFLICT ("userId") DO UPDATE SET default_catalog_item_ids_json = $2, updated_at = NOW()`,
  [USER_ID, JSON.stringify(ids)],
)
console.log("[v0] default anchors:", defaults.rows.map((r) => r.name))

const active = await pool.query(
  `SELECT name, billing_type, currency, price_minor, max_price_minor FROM spending_anchors
   WHERE "userId" = $1 AND is_active = TRUE ORDER BY sort_order, id`,
  [USER_ID],
)
console.table(active.rows)
await pool.end()
