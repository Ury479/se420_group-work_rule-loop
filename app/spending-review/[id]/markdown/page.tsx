import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getSpendingReview, exportMarkdown } from "@/app/actions/spending-review"
import { generateReviewMarkdown } from "@/lib/spending-markdown"
import { SpendingMarkdownViewer } from "@/components/spending-markdown-viewer"
import type { SpendingReviewExport } from "@/lib/db/schema"

export const metadata = { title: "Markdown 审核文档 | 决策拦截台" }

export default async function SpendingMarkdownPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()
  const detail = await getSpendingReview(numId)
  if (!detail) notFound()

  // 已有导出记录则复用,否则生成新的
  let exportRecord: SpendingReviewExport | null = detail.exportRecord
  let markdown: string
  if (exportRecord) {
    markdown = exportRecord.markdownContent
  } else {
    const res = await exportMarkdown(numId)
    if ("markdown" in res && typeof res.markdown === "string") {
      markdown = res.markdown
      exportRecord = res.export ?? null
    } else {
      markdown = generateReviewMarkdown(detail.review, detail.toolCheck)
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <Link
        href={`/spending-review/${numId}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回审核详情
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Markdown 审核文档</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          复制全文,手动粘贴给外部 GPT 审核。审核后到「回写 GPT 结果」页面填写结论。
        </p>
      </header>
      <SpendingMarkdownViewer
        markdown={markdown}
        exportId={exportRecord?.id ?? 0}
        submitted={exportRecord?.submittedToGpt ?? false}
        title={detail.review.title}
      />
    </main>
  )
}
