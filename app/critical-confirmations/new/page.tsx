import { NewConfirmationForm } from "@/components/new-confirmation-form"
import type { Domain } from "@/lib/types"

export const metadata = { title: "新建关键确认 | 关键动作拦截台" }

export default async function NewConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string }>
}) {
  const params = await searchParams
  const domain = ["study", "purchase", "relationship", "custom"].includes(
    params.domain ?? ""
  )
    ? (params.domain as Domain)
    : "study"

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">提前布防</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          用 1&ndash;2 分钟提前想清楚:这件事最容易错在哪里?最后确认时必须看什么?
        </p>
      </section>
      <NewConfirmationForm initialDomain={domain} />
    </div>
  )
}
