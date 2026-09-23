import Link from "next/link"
import { EventSearch } from "@/components/event-search"
import { ArrowLeft } from "lucide-react"

export default function EventSearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-library"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回案例库
      </Link>
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">搜索经验资产</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          所有经验必须可搜索。按标题、摘要、物品或标签检索历史案例。
        </p>
      </section>
      <EventSearch />
    </div>
  )
}
