import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSpendingReview } from "@/app/actions/spending-review"
import { GptResultForm } from "@/components/gpt-result-form"

export default async function GptResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const reviewId = Number(id)
  if (Number.isNaN(reviewId)) notFound()

  const data = await getSpendingReview(reviewId)
  if (!data) notFound()

  return (
    <main className="flex flex-col gap-5">
      <Link
        href={`/spending-review/${reviewId}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回审核详情
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance">回写 GPT 审核结果</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          将外部 GPT 对「{data.review.title}」的审核结论手动记录到系统中。
        </p>
      </header>
      <GptResultForm reviewId={reviewId} />
    </main>
  )
}
