import { notFound } from "next/navigation"
import { getConfirmation, getConfirmationItems } from "@/app/actions/confirmations"
import { CheckFlow } from "@/components/check-flow"
import { RiskBadge, DomainBadge } from "@/components/badges"
import { TriangleAlert } from "lucide-react"

export const metadata = { title: "90% 检查 | 关键动作拦截台" }

export default async function CheckPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const confirmationId = Number(id)
  if (!Number.isInteger(confirmationId)) notFound()

  const confirmation = await getConfirmation(confirmationId)
  if (!confirmation) notFound()
  const items = await getConfirmationItems(confirmationId)

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <DomainBadge domain={confirmation.domain} />
          <RiskBadge risk={confirmation.riskLevel} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {confirmation.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          慢 30 秒,一次只确认一件事。
        </p>
        {confirmation.likelyMistake && (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            最容易错:{confirmation.likelyMistake}
          </p>
        )}
      </section>

      <CheckFlow
        confirmationId={confirmation.id}
        riskLevel={confirmation.riskLevel}
        items={items.map((item) => ({
          id: item.id,
          itemText: item.itemText,
          isRequired: item.isRequired,
          isChecked: item.isChecked,
          confirmationRound: item.confirmationRound,
        }))}
      />
    </div>
  )
}
