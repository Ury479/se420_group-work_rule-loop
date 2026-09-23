import { notFound } from "next/navigation"
import { getBoundary } from "@/app/actions/boundaries"
import { BoundaryCheckFlow } from "@/components/boundary-check-flow"

export const dynamic = "force-dynamic"

export default async function BoundaryCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isFinite(numId)) notFound()
  const data = await getBoundary(numId)
  if (!data) notFound()
  const { boundary } = data

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">边界检查</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{boundary.title}</p>
        <p className="text-xs text-muted-foreground">
          时间盒 {boundary.timeboxMinutes} 分钟 · 一次只回答一个问题,如实作答即可。
        </p>
      </section>
      <BoundaryCheckFlow boundaryId={boundary.id} timeboxMinutes={boundary.timeboxMinutes} />
    </div>
  )
}
