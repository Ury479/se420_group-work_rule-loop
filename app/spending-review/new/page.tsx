import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SpendingReviewForm } from "@/components/spending-review-form"
import { getActiveAnchors } from "@/app/actions/spending-anchors"

export const metadata = { title: "新建支出审核 | 决策拦截台" }

export default async function NewSpendingReviewPage() {
  const anchors = await getActiveAnchors()
  return (
    <main className="flex flex-col gap-4">
      <Link
        href="/spending-review"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回拦截台
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">新建支出审核</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          基础信息 → 状态识别 → 财务安全 → 需求拆解 → 主线核对 → 风险结论。
        </p>
      </header>
      <SpendingReviewForm anchors={anchors} />
    </main>
  )
}
