import Link from "next/link"
import { getRulesList } from "@/app/actions/event-library"
import { EventRuleRow } from "@/components/event-rule-row"
import { ArrowLeft, ScrollText } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function RulesPage() {
  const rules = await getRulesList()
  const groups = [
    { key: "candidate", title: "候选规则", items: rules.filter((r) => r.status === "candidate") },
    { key: "active", title: "生效中", items: rules.filter((r) => r.status === "active") },
    {
      key: "other",
      title: "已归档 / 已拒绝",
      items: rules.filter((r) => r.status === "archived" || r.status === "rejected"),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-library"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回案例库
      </Link>

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">规则库</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          每个复盘的第 5 问自动生成候选规则。启用后,每天守住一次点一次验证——规则必须不断验证。
        </p>
      </section>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
          <ScrollText className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            还没有规则。完成案例复盘并回答第 5 问,系统会自动生成候选规则。
          </p>
        </div>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {g.title} · {g.items.length}
              </h2>
              <div className="flex flex-col gap-2">
                {g.items.map((r) => (
                  <EventRuleRow key={r.id} rule={r} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  )
}
