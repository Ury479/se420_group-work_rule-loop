import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getDecisionBaseline } from "@/app/actions/spending-review"
import { DecisionBaselineForm } from "@/components/decision-baseline-form"

export default async function DecisionBaselinePage() {
  const baseline = await getDecisionBaseline()

  return (
    <main className="flex flex-col gap-5">
      <Link
        href="/spending-review"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回决策拦截台
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance">最佳状态决策协议</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          在状态好的时候写下规则,在状态差的时候由系统替你守住。负面状态下的任何决策都以这里为基准。
        </p>
      </header>
      <DecisionBaselineForm baseline={baseline} />
    </main>
  )
}
