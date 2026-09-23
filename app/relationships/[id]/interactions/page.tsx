import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getRelationship } from "@/app/actions/relationships"
import { InteractionForm } from "@/components/interaction-form"

export const metadata: Metadata = {
  title: "记录互动 | 人际关系筛查台",
}

export default async function InteractionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const relationshipId = Number(id)
  if (!Number.isFinite(relationshipId)) notFound()
  const relationship = await getRelationship(relationshipId)
  if (!relationship) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">
          记录互动:{relationship.personName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          只写事实,不写评价。系统会基于新事实重新评估关系状态。
        </p>
      </header>
      <InteractionForm relationshipId={relationshipId} />
    </div>
  )
}
