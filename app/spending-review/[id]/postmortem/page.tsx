import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CircleCheck } from "lucide-react"
import { getSpendingReview } from "@/app/actions/spending-review"
import { SpendingPostmortemForm } from "@/components/spending-postmortem-form"

export default async function SpendingPostmortemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const reviewId = Number(id)
  if (Number.isNaN(reviewId)) notFound()
  const data = await getSpendingReview(reviewId)
  if (!data) notFound()

  return (
    <main className="min-h-dvh bg-background pt-8 lg:pt-10">
      <header className="w-full px-6">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <Link href={`/spending-review/${reviewId}`} className="inline-flex items-center gap-3 text-xl font-medium"><ArrowLeft className="size-7" />复盘</Link>
          <span className="inline-flex items-center gap-2 text-lg text-success"><CircleCheck className="size-6" />已自动保存</span>
        </div>
        <div className="py-7 text-center">
          <p className="text-xl text-muted-foreground">来源事件</p>
          <h1 className="mt-4 font-serif text-[2.15rem] leading-snug tracking-[0.04em] text-balance">{data.review.title || "文件误提交"}</h1>
          <p className="mt-3 text-lg text-muted-foreground">高影响 · 学习 / 工作</p>
        </div>
      </header>
      <SpendingPostmortemForm reviewId={reviewId} />
    </main>
  )
}
