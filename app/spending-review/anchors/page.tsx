import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAnchors } from "@/app/actions/spending-anchors"
import { AnchorManager } from "@/components/anchor-manager"

export const metadata = { title: "消费参照物 | 决策拦截台" }

export default async function SpendingAnchorsPage() {
  const anchors = await getAnchors()

  return (
    <main className="flex flex-col gap-4">
      <Link
        href="/spending-review"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回拦截台
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">消费参照物</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          记录你真实的历史消费,建立自己的价值坐标系。下次审核支出时,金额会自动换算成这些参照物,帮你保持清醒。
        </p>
      </header>
      <AnchorManager anchors={anchors} />
    </main>
  )
}
