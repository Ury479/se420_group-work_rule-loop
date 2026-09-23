import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getRelationship } from "@/app/actions/relationships"
import { BoundaryCheck } from "@/components/boundary-check"

export const metadata: Metadata = {
  title: "底线防护检查 | 人际关系筛查台",
}

export default async function BoundaryCheckPage({
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
          底线防护检查:{relationship.personName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          先守住底线,再维护关系。涉及时间、金钱、项目资源或情绪安抚时,必须先过这 5 问。
        </p>
      </header>
      <BoundaryCheck
        relationshipId={relationshipId}
        boundaryNotes={relationship.boundaryNotes}
      />
    </div>
  )
}
