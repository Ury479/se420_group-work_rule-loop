import type { Metadata } from "next"
import { QuickCheckForm } from "@/components/quick-check-form"
import type { FinalActionType } from "@/lib/types"

export const metadata: Metadata = {
  title: "90% 快速检查 | 关键动作拦截台",
  description: "关键动作前的 30-60 秒快速确认。",
}

const VALID_ACTIONS: FinalActionType[] = [
  "submit",
  "pay",
  "send",
  "depart",
  "confirm",
  "book",
  "delete",
  "custom",
]

export default async function QuickCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  const params = await searchParams
  const action = VALID_ACTIONS.includes(params.action as FinalActionType)
    ? (params.action as FinalActionType)
    : "submit"

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">90% 快速检查</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          在你按下最终按钮之前,先停 30&ndash;60 秒。回答 3 个问题就够了。
        </p>
      </header>
      <QuickCheckForm initialAction={action} />
    </div>
  )
}
