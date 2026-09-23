import { notFound } from "next/navigation"
import { RuleConfirm } from "@/components/rule-confirm"
import { getRule } from "@/app/actions/rules"

export const metadata = {
  title: "确认拦截规则 | 关键动作拦截台",
}

export default async function RuleConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ruleId = Number(id)
  if (Number.isNaN(ruleId)) notFound()

  const rule = await getRule(ruleId)
  if (!rule) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">确认拦截规则</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          这条规则由你的复盘生成。只有点击确认后,它才会在未来的确认流程中生效。
        </p>
      </header>
      <RuleConfirm rule={rule} />
    </div>
  )
}
