"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRelationshipReview } from "@/app/actions/relationships"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Loader2, Flame, CheckCircle2 } from "lucide-react"

export function RelationshipReviewForm({ relationshipId }: { relationshipId: number }) {
  const router = useRouter()
  const [showOptional, setShowOptional] = useState(false)
  const [writeToRules, setWriteToRules] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<{ linkedRuleId: number | null } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const res = await createRelationshipReview({
      relationshipId,
      whatHappened: String(form.get("whatHappened") ?? ""),
      ignoredSignal: String(form.get("ignoredSignal") ?? "") || null,
      rushedOrEmotionalPart: String(form.get("rushedOrEmotionalPart") ?? "") || null,
      peoplePleasingPart: String(form.get("peoplePleasingPart") ?? "") || null,
      boundaryCrossed: String(form.get("boundaryCrossed") ?? "") || null,
      possibleCoreNeed: String(form.get("possibleCoreNeed") ?? "") || null,
      lesson: String(form.get("lesson") ?? ""),
      principle: String(form.get("principle") ?? ""),
      interceptionRule: String(form.get("interceptionRule") ?? ""),
      writeToRules,
    })
    setSubmitting(false)
    if ("error" in res && res.error) {
      setError(res.error)
      return
    }
    if ("success" in res) {
      setSaved({ linkedRuleId: ("linkedRuleId" in res ? res.linkedRuleId : null) as number | null })
    }
  }

  if (saved) {
    return (
      <Card className="border-success py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            灰烬备忘录已保存。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {saved.linkedRuleId
              ? "拦截规则已写入规则库。下次给类似对象发消息或做承诺时会自动命中。"
              : "本次没有写入规则库,以后可以随时补充。"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/relationships/${relationshipId}`)}>
              返回关系详情
            </Button>
            {saved.linkedRuleId && (
              <Button variant="outline" onClick={() => router.push("/rules")}>
                查看规则库
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatHappened">这次人际事件发生了什么? *</Label>
            <Textarea
              id="whatHappened"
              name="whatHappened"
              required
              maxLength={2000}
              rows={3}
              placeholder="只写事实。例如:我为了维持关系,答应了超出自己时间承受范围的事情。"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson">教训 *</Label>
            <Textarea
              id="lesson"
              name="lesson"
              required
              maxLength={1000}
              rows={2}
              placeholder="例如:我为了快速维持关系,答应了超出自己时间和精力承受范围的事情。"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="principle">一句话原则 *</Label>
            <Input
              id="principle"
              name="principle"
              required
              maxLength={500}
              placeholder="例如:重要关系中,稳定比讨好更重要。没有确认代价前,不做即时承诺。"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="interceptionRule">下次的拦截规则 *</Label>
            <Input
              id="interceptionRule"
              name="interceptionRule"
              required
              maxLength={500}
              placeholder="例如:当沟通涉及承诺时间、金钱、项目资源或情绪安抚时,必须先进入底线防护检查。"
              className="h-11"
            />
          </div>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={writeToRules}
              onCheckedChange={(v) => setWriteToRules(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">
              把拦截规则写入规则库,下次类似沟通自动命中
            </span>
          </label>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        aria-expanded={showOptional}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showOptional ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {showOptional ? "收起深入复盘" : "深入复盘(可选,以后也可以补)"}
      </button>

      {showOptional && (
        <Card className="py-5">
          <CardContent className="flex flex-col gap-5 px-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ignoredSignal">我当时忽略了什么信号?</Label>
              <Textarea id="ignoredSignal" name="ignoredSignal" maxLength={500} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rushedOrEmotionalPart">
                我哪里太急、太自信、太想讨好,或太情绪化?
              </Label>
              <Textarea
                id="rushedOrEmotionalPart"
                name="rushedOrEmotionalPart"
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="peoplePleasingPart">哪部分是在讨好对方?</Label>
              <Textarea
                id="peoplePleasingPart"
                name="peoplePleasingPart"
                maxLength={500}
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="boundaryCrossed">我是否损害了自己的底线?</Label>
              <Textarea id="boundaryCrossed" name="boundaryCrossed" maxLength={500} rows={2} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="possibleCoreNeed">对方可能真正关心什么?(推测)</Label>
              <Textarea
                id="possibleCoreNeed"
                name="possibleCoreNeed"
                maxLength={500}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="h-12 text-base">
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Flame className="size-5" aria-hidden="true" />
        )}
        保存灰烬备忘录并生成规则
      </Button>
    </form>
  )
}
