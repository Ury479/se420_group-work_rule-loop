"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveDecisionBaseline } from "@/app/actions/spending-review"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { DecisionBaseline } from "@/lib/db/schema"

const FIELDS: { name: string; label: string; placeholder: string; key: keyof DecisionBaseline }[] = [
  {
    name: "coreAbilities",
    label: "理性状态下的核心能力",
    placeholder: "例:能区分「情绪需求」和「真实需求」;能等待 72 小时再决定…",
    key: "coreAbilities",
  },
  {
    name: "financialRules",
    label: "财务红线",
    placeholder: "例:不动用生活费/学费/应急资金;单笔娱乐支出不超过 X 元…",
    key: "financialRules",
  },
  {
    name: "healthRules",
    label: "健康红线",
    placeholder: "例:不用健康预算支付非健康支出;熬夜后 24 小时内不做支出决策…",
    key: "healthRules",
  },
  {
    name: "mainlineRules",
    label: "主线保护规则",
    placeholder: "例:任何支出不得挤占仪表盘/算法/AI 课程的时间与预算…",
    key: "mainlineRules",
  },
  {
    name: "sleepRules",
    label: "睡眠保护规则",
    placeholder: "例:23:00 后不做任何支出决策;睡眠不足时冲动等级自动 +2…",
    key: "sleepRules",
  },
  {
    name: "toolPurchaseRules",
    label: "AI 工具/课程购买规则",
    placeholder: "例:现有工具额度未用完不买新工具;购买前必须写出未来 7 天具体使用场景…",
    key: "toolPurchaseRules",
  },
  {
    name: "decisionProcess",
    label: "标准决策流程",
    placeholder: "例:填写审核表 → 风险评估 → 冷静期 → 导出给 GPT → 回写结论 → 最终决定…",
    key: "decisionProcess",
  },
]

export function DecisionBaselineForm({ baseline }: { baseline: DecisionBaseline | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await saveDecisionBaseline(fd)
      if (res?.error) {
        setError(res.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">协议名称</Label>
        <Input id="title" name="title" defaultValue={baseline?.title ?? "最佳状态决策协议"} required />
      </div>

      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col gap-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Textarea
            id={f.name}
            name={f.name}
            rows={3}
            placeholder={f.placeholder}
            defaultValue={(baseline?.[f.key] as string | null) ?? ""}
          />
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-muted-foreground">已保存。</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "保存中…" : "保存协议"}
      </Button>
    </form>
  )
}
