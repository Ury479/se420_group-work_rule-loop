import Link from "next/link"
import { getPatterns } from "@/app/actions/event-library"
import { ArrowLeft, Network } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const riskTone: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-accent text-accent-foreground",
  low: "bg-muted text-muted-foreground",
}

const riskLabel: Record<string, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险",
}

export default async function PatternsPage() {
  const patterns = await getPatterns()

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
        <h1 className="text-2xl font-semibold tracking-tight text-balance">模式识别</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          基于你复盘时选择的根因自动聚合。同一根因出现 2 次为中风险,3 次及以上为高风险。
        </p>
      </section>

      {patterns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
          <Network className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            还没有模式。完成案例复盘后,系统会自动按根因聚合出你的行为模式。
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {patterns.map((p) => (
            <div key={p.rootCause} className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", riskTone[p.riskLevel])}>
                  {riskLabel[p.riskLevel]}
                </span>
                <h2 className="text-sm font-semibold">{p.label}</h2>
                <span className="text-xs text-muted-foreground">{`证据 ${p.evidenceCount} 次`}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {p.totalSearchMinutes > 0 && <span>{`累计寻找 ${p.totalSearchMinutes} 分钟`}</span>}
                {p.totalMoneyLoss > 0 && <span>{`累计损失 ${p.totalMoneyLoss} 元`}</span>}
              </div>
              <div className="flex flex-col gap-1">
                {p.caseIds.map((cid, i) => (
                  <Link
                    key={cid}
                    href={`/event-library/${cid}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {p.caseTitles[i]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
