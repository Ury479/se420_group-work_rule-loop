import type { Metadata } from "next"
import { AshMemoForm } from "@/components/ash-memo-form"

export const metadata: Metadata = {
  title: "新建灰烬备忘录 | 关键动作拦截台",
  description: "把这次错误变成下次的拦截规则。",
}

export default async function NewAshMemoPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmationId?: string }>
}) {
  const params = await searchParams
  const confirmationId = params.confirmationId
    ? Number.parseInt(params.confirmationId, 10)
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">灰烬备忘录</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          这不是普通复盘。花 3 分钟,把刺痛的经历转化为教训、原则和拦截规则,
          让系统在下次类似场景自动拦住你。
        </p>
      </header>
      <AshMemoForm
        confirmationId={
          confirmationId && !Number.isNaN(confirmationId)
            ? confirmationId
            : undefined
        }
      />
    </div>
  )
}
