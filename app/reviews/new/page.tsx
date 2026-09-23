import { notFound } from "next/navigation"
import { ReviewForm } from "@/components/review-form"
import { MiniReviewForm } from "@/components/mini-review-form"
import { getEventCase } from "@/app/actions/event-library"

export const metadata = {
  title: "错误复盘 | 关键动作拦截台",
}

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmationId?: string; eventId?: string }>
}) {
  const params = await searchParams
  const confirmationId = params.confirmationId
    ? Number(params.confirmationId)
    : undefined

  // 事件复盘分支:来自「记录事件 → 保存并开始复盘」,渲染三步复盘任务
  const eventId = params.eventId ? Number(params.eventId) : undefined
  if (eventId && !Number.isNaN(eventId)) {
    const data = await getEventCase(eventId)
    if (!data) notFound()
    const c = data.eventCase
    return (
      <div className="flex flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-balance">复盘任务</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            三步:风险信号 → 决策点 → 下次行动。
          </p>
        </header>
        <MiniReviewForm
          eventId={c.id}
          eventTitle={c.title}
          impactLevel={c.impactLevel}
          eventCreatedAt={new Date(c.createdAt).toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">错误复盘</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          出错不是终点。花 3 分钟把这次错误变成一条可以拦住下一次的规则。
        </p>
      </header>
      <ReviewForm
        confirmationId={
          confirmationId && !Number.isNaN(confirmationId)
            ? confirmationId
            : undefined
        }
      />
    </div>
  )
}
