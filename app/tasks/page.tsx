import type { Metadata } from "next"
import { getTaskTreeData } from "@/app/actions/tree-tasks"
import { TaskTree } from "@/components/task-tree"
import { OkrPanel } from "@/components/okr-panel"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ListTree } from "lucide-react"

export const metadata: Metadata = {
  title: "关键任务分解 | 关键动作确认系统",
  description: "目标 → 拆解 → 执行 → 量化 → 反馈的任务闭环",
}

export default async function TasksPage() {
  const data = await getTaskTreeData()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ListTree className="size-5 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold tracking-tight">
            关键任务分解
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          把复杂目标逐层拆解为可执行任务,完成率由系统自动计算,不靠手填。
        </p>
      </header>

      <Card className="py-4">
        <CardContent className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">总体进度</span>
            <span className="tabular-nums text-muted-foreground">
              {data.overall.progress}% · 已完成 {data.overall.done}/
              {data.overall.total} 个执行项
            </span>
          </div>
          <Progress value={data.overall.progress} aria-label="总体进度" />
        </CardContent>
      </Card>

      <OkrPanel objectives={data.objectives} />
      <TaskTree data={data} />
    </div>
  )
}
