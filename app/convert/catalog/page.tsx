import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getCatalogItems, getConversionPreferences } from "@/app/actions/spend-conversion"
import { CatalogManager } from "@/components/catalog-manager"

export const metadata = { title: "价值目录 | 消费换算" }

export default async function CatalogPage() {
  const [items, prefs] = await Promise.all([getCatalogItems(), getConversionPreferences()])

  return (
    <main className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/convert"
          className="flex min-h-11 w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          返回消费换算
        </Link>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">价值目录与汇率</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          这里的价格全部由你自己维护,系统不会联网核验。改动只影响之后的换算,已经生成的记录仍按当时快照显示。
        </p>
      </header>

      <CatalogManager items={items} prefs={prefs} />
    </main>
  )
}
