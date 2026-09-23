import type { Metadata } from "next"
import { getDemandsOverview } from "@/app/actions/weakness"
import { DemandBoard } from "@/components/demand-board"

export const metadata: Metadata = {
  title: "需求与 Backlog | 关键动作拦截台",
  description: "P0 锁定机制:P0 未完成前,新增需求默认进入 Backlog。",
}

export default async function DemandsPage() {
  const overview = await getDemandsOverview()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          需求与 Backlog
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          防止新增需求替代执行。P0 未完成前,新增需求默认进入 Backlog。
        </p>
      </header>
      <DemandBoard
        active={overview.active}
        backlog={overview.backlog}
        done={overview.done}
        lock={overview.lock}
      />
    </div>
  )
}
