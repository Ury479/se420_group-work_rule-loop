// 预置价值目录(全部标记为"用户录入,未自动核验"),按名称幂等 upsert
// 运行:node --env-file-if-exists=/vercel/share/.env.project scripts/seed-value-catalog.mjs
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const USER_ID = process.env.SEED_USER_ID ?? "default-user"
const NOTE = "用户录入,未自动核验"

// [名称, 计费类型, 币种, 单价(最小单位), 区间上限, 单位标签, 排序]
const ITEMS = [
  ["GPT Pro", "subscription", "USD", 10000, null, "个月", 10],
  ["豆包个人高阶版", "subscription", "CNY", 15900, null, "个月", 20],
  ["v0", "subscription", "CNY", 15000, null, "个月", 30],
  ["Kimi", "subscription", "CNY", 30000, null, "个月", 40],
  ["智谱官方额度", "subscription", "CNY", 30000, null, "个月", 50],
  ["Cursor Pro", "subscription", "USD", 2000, null, "个月", 60],
  ["Claude Max", "subscription", "USD", 10000, null, "个月", 70],
  ["Claude Pro 年付月均", "subscription", "USD", 1700, null, "个月", 80],
  ["GPT API 额度包", "credit_pack", "USD", 20000, null, "包", 90],
  ["日常一顿饭", "range_unit", "CNY", 4000, 6000, "顿", 100],
  ["面膜", "single_unit", "CNY", 17000, null, "份", 110],
]

for (const [name, billingType, currency, priceMinor, maxPriceMinor, unitLabel, sortOrder] of ITEMS) {
  const existing = await pool.query(`SELECT id FROM spending_anchors WHERE "userId" = $1 AND name = $2 LIMIT 1`, [USER_ID, name])
  // price_cny 为既有列(整数元),继续写入以兼容旧的锚点展示
  const priceCny = Math.round(priceMinor / 100)
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE spending_anchors
       SET billing_type = $1, currency = $2, price_minor = $3, max_price_minor = $4, unit_label = $5,
           sort_order = $6, source_note = $7, price_cny = $8, updated_at = NOW()
       WHERE id = $9`,
      [billingType, currency, priceMinor, maxPriceMinor, unitLabel, sortOrder, NOTE, priceCny, existing.rows[0].id],
    )
  } else {
    await pool.query(
      `INSERT INTO spending_anchors
         ("userId", name, price_cny, unit_label, billing_type, currency, price_minor, max_price_minor, sort_order, source_note, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)`,
      [USER_ID, name, priceCny, unitLabel, billingType, currency, priceMinor, maxPriceMinor, sortOrder, NOTE],
    )
  }
}

await pool.query(
  `INSERT INTO conversion_preferences ("userId") VALUES ($1) ON CONFLICT ("userId") DO NOTHING`,
  [USER_ID],
)

const rows = await pool.query(
  `SELECT name, billing_type, currency, price_minor, max_price_minor FROM spending_anchors WHERE "userId" = $1 ORDER BY sort_order`,
  [USER_ID],
)
console.log("[v0] catalog items:", rows.rows.length)
console.table(rows.rows)
await pool.end()
