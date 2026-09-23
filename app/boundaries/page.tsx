import Link from "next/link"
import { getBoundarySummary } from "@/app/actions/boundaries"
import { Button } from "@/components/ui/button"
import { BoundaryCard } from "@/components/boundary-card"
import { ShieldAlert, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BoundariesPage() {
  const summary = await getBoundarySummary()

  const sections: { title: string; hint: string; items: typeof summary.deepWorking }[] = [
    {
      title: "今日需要守住的边界",
      hint: "进行中的边界卡,守住时间盒和停止条件",
      items: summary.todayBoundaries,
    },
    {
      title: "可能过度执行的任务",
      hint: "检查判定为 stop / pause 的任务,先停下来",
      items: summary.overExecuting,
    },
    {
      title: "信息不足但正在推进的任务",
      hint: "只允许小步验证,禁止重投入",
      items: summary.lowInfoAdvancing,
    },
    {
      title: "已进入 Backlog 的好想法",
      hint: "好需求不一定现在做,放这里也是正确动作",
      items: summary.backlogged,
    },
  ]

  const isEmpty = sections.every((s) => s.items.length === 0)

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">安全边界与节奏控制台</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          明确做到什么程度就够,防止好想法过度执行,保护总体稳定。
        </p>
        <p className="text-xs font-medium text-muted-foreground">稳定高于一切。远离贪婪就是远离贫穷。</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/boundaries/new" />}>
            <Plus className="size-4" aria-hidden="true" />
            新建安全边界
          </Button>
        </div>
      </section>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            还没有边界卡。下次准备深做一件事之前,先回答三个问题:最低做到什么程度就够?继续深做会挤占什么?什么时候必须停?
          </p>
        </div>
      ) : (
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <section key={section.title} className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-sm font-semibold">{section.title}</h2>
                  <p className="text-xs text-muted-foreground">{section.hint}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {section.items.map((b) => (
                    <BoundaryCard key={`${section.title}-${b.id}`} boundary={b} />
                  ))}
                </div>
              </section>
            )
        )
      )}
    </div>
  )
}
