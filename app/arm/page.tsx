import type { Metadata } from "next"
import { ArmForm } from "@/components/arm-form"

export const metadata: Metadata = {
  title: "80% 布防 | 关键动作拦截台",
  description: "提前记录风险,避免最后一刻靠情绪判断。",
}

export default function ArmPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-balance">80% 布防</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          刚知道这件事、刚产生顾虑时,用 1&ndash;2 分钟提前布防。只需要回答 3
          个问题。
        </p>
      </header>
      <ArmForm />
    </div>
  )
}
