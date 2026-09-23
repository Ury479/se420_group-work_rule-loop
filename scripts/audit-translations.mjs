// 审计脚本:列出源码里出现但词典未覆盖的中文界面文案。
// 用法: node scripts/audit-translations.mjs [文件或目录...]
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const HAS_CHINESE = /[\u3400-\u9fff]/
const dictSource = readFileSync("lib/page-translation-dict.ts", "utf8")

const dictKeys = new Set()
for (const m of dictSource.matchAll(/^\s*"((?:[^"\\]|\\.)+)":/gm)) {
  dictKeys.add(m[1].replace(/\s+/g, " ").trim())
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx$/.test(full)) out.push(full)
  }
  return out
}

const targets = process.argv.slice(2)
const files = targets.length
  ? targets.flatMap((t) => (statSync(t).isDirectory() ? walk(t) : [t]))
  : [...walk("app"), ...walk("components")]

const missing = new Map()

for (const file of files) {
  const src = readFileSync(file, "utf8")

  // JSX 文本节点:>文本<
  for (const m of src.matchAll(/>([^<>{}]*[\u3400-\u9fff][^<>{}]*)</g)) {
    add(m[1], file)
  }
  // 字符串字面量(含 label / placeholder / 数组常量)
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*[\u3400-\u9fff](?:[^"\\\n]|\\.)*)"/g)) {
    add(m[1], file)
  }
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*[\u3400-\u9fff](?:[^'\\\n]|\\.)*)'/g)) {
    add(m[1], file)
  }
}

function add(raw, file) {
  const text = raw.replace(/\s+/g, " ").trim()
  if (!text || !HAS_CHINESE.test(text)) return
  if (text.includes("\uFFFD")) return
  if (dictKeys.has(text)) return
  if (!missing.has(text)) missing.set(text, new Set())
  missing.get(text).add(file)
}

const rows = [...missing.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh"))
for (const [text, where] of rows) {
  console.log(`${text}\t<- ${[...where].join(", ")}`)
}
console.log(`\n未覆盖文案: ${rows.length} 条 / 扫描文件 ${files.length} 个 / 词条 ${dictKeys.size} 条`)
