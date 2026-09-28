import { notFound } from "next/navigation"
import { getConversionDetail } from "@/app/actions/spend-conversion"
import { SpendingCheckpointPreview } from "@/components/spending-checkpoint/preview"
import { formatMinor, formatQuantity, RESOLUTION_LABEL, type Resolution } from "@/lib/convert-domain"
import type { ConversionContext } from "@/lib/spending-checkpoint-preview"

export const metadata = {
  title: "消费审查设计预览",
  description: "记住投入时的期待，对照结果与未知，在约定节点进行一次最小验证。隔离设计预览，不写入真实记录。",
  robots: { index: false, follow: false },
}

export default async function SpendingCheckpointPage({ searchParams }: { searchParams: Promise<{ conversion?: string }> }) {
  const { conversion: rawId } = await searchParams
  let context: ConversionContext | undefined
  if (rawId !== undefined) {
    const id = Number(rawId)
    if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0) notFound()
    const detail = await getConversionDetail(id)
    if (!detail) notFound()
    const { conversion, snapshot } = detail
    context = {
      id, amount: formatMinor(conversion.plannedAmountMinor), currency: conversion.inputCurrency,
      options: snapshot?.items.map((item) => `${item.name} · ${formatQuantity(item)}`) ?? [],
      rate: snapshot?.items.find((item) => item.currency === "USD")?.toCnyRate?.toString() ?? null,
      capturedAt: snapshot?.calculatedAt ?? null,
      resolution: conversion.resolution ? RESOLUTION_LABEL[conversion.resolution as Resolution] : "尚未记录购买决定",
    }
  }
  return <SpendingCheckpointPreview conversion={context} />
}
