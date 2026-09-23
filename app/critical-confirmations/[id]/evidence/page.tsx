import { notFound } from "next/navigation"
import { getConfirmation } from "@/app/actions/confirmations"
import { getEvidence } from "@/app/actions/evidence-review"
import { EvidenceForm } from "@/components/evidence-form"
import { EVIDENCE_TYPE_LABELS, type EvidenceType } from "@/lib/types"

export const metadata = { title: "必要证据 | 关键动作拦截台" }

export default async function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const confirmationId = Number(id)
  if (!Number.isInteger(confirmationId)) notFound()

  const confirmation = await getConfirmation(confirmationId)
  if (!confirmation) notFound()

  // 已完成的任务进入补充模式:只追加证据,不改状态
  const supplementMode =
    confirmation.status === "confirmed" || confirmation.status === "reviewed"
  const existingEvidence = supplementMode ? await getEvidence(confirmationId) : []

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          {confirmation.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {supplementMode
            ? "随时补充证据或备注,不断完善这条记录。"
            : "留一句话就够了,方便以后追溯。也可以直接完成,以后再补。"}
        </p>
      </header>

      {existingEvidence.length > 0 && (
        <section
          aria-label="已保存的证据"
          className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/50 p-4"
        >
          <h2 className="text-sm font-medium text-muted-foreground">已保存的证据</h2>
          <ul className="flex flex-col gap-1.5">
            {existingEvidence.map((ev) => (
              <li key={ev.id} className="text-sm leading-relaxed">
                <span className="font-medium text-muted-foreground">
                  {EVIDENCE_TYPE_LABELS[ev.evidenceType as EvidenceType] ?? ev.evidenceType}
                  {" · "}
                </span>
                {ev.evidenceText}
              </li>
            ))}
          </ul>
        </section>
      )}

      <EvidenceForm confirmationId={confirmation.id} supplementMode={supplementMode} />
    </div>
  )
}
