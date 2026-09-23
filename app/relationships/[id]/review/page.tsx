import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getRelationship } from "@/app/actions/relationships"
import { RelationshipReviewForm } from "@/components/relationship-review-form"

export const metadata: Metadata = {
  title: "人际灰烬备忘录 | 人际关系筛查台",
}

export default async function RelationshipReviewPage({
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
          人际灰烬备忘录:{relationship.personName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          误判、冲动、消耗、讨好、底线受损之后,把损失变成原则和拦截规则。
          只有教训、原则、规则是必填,其余以后可以补。
        </p>
      </header>
      <RelationshipReviewForm relationshipId={relationshipId} />
    </div>
  )
}
