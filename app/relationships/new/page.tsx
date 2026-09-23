import type { Metadata } from "next"
import { NewRelationshipForm } from "@/components/new-relationship-form"

export const metadata: Metadata = {
  title: "新建关系筛查 | 人际关系筛查台",
}

export default async function NewRelationshipPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const initialMode = mode === "deep" ? "deep" : "quick"

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">新建关系筛查</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          先确认事实,再判断关系。快速筛查只需 3 个问题,不超过 60 秒。
        </p>
      </header>
      <NewRelationshipForm initialMode={initialMode} />
    </div>
  )
}
