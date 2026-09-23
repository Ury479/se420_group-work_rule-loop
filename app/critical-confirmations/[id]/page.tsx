import { notFound, redirect } from "next/navigation"
import { getConfirmation } from "@/app/actions/confirmations"

// /critical-confirmations/[id] 没有独立详情页,统一进入 90% 检查流程
export default async function ConfirmationEntryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const confirmationId = Number(id)
  if (!Number.isInteger(confirmationId)) notFound()

  const confirmation = await getConfirmation(confirmationId)
  if (!confirmation) notFound()

  redirect(`/critical-confirmations/${confirmationId}/check`)
}
