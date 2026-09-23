import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  getRelationship,
  isHighRiskCommunication,
} from "@/app/actions/relationships"
import { CommunicationCheck } from "@/components/communication-check"

export const metadata: Metadata = {
  title: "沟通前检查 | 人际关系筛查台",
}

export default async function CommunicationCheckPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const relationshipId = Number(id)
  if (!Number.isFinite(relationshipId)) notFound()
  const relationship = await getRelationship(relationshipId)
  if (!relationship) notFound()
  const { highRisk } = await isHighRiskCommunication(relationshipId)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">
          沟通前检查:{relationship.personName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          稳就是快。先稳住,再表达。逐项确认后再发送。
        </p>
      </header>
      <CommunicationCheck
        relationshipId={relationshipId}
        personName={relationship.personName}
        highRisk={highRisk}
        landmines={relationship.communicationLandmines}
        boundaryNotes={relationship.boundaryNotes}
      />
    </div>
  )
}
