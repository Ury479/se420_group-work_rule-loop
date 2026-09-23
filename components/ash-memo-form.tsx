"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createAshMemo } from "@/app/actions/intercept"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { DOMAIN_LABELS, type Domain } from "@/lib/types"
import {
  WEAKNESS_LABELS,
  WHY_SYSTEM_FAILED_LABELS,
  NEXT_INTERCEPTION_POINT_LABELS,
  type WeaknessKey,
} from "@/lib/weakness"
import { Flame, Loader2, ChevronDown } from "lucide-react"

const NONE = "none"

export function AshMemoForm({ confirmationId }: { confirmationId?: number }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lesson, setLesson] = useState("")
  const [principle, setPrinciple] = useState("")
  const [moreOpen, setMoreOpen] = useState(false)
  const [domain, setDomain] = useState<Domain>("custom")
  const [exposedWeakness, setExposedWeakness] = useState<string>(NONE)
  const [whySystemFailed, setWhySystemFailed] = useState<string>(NONE)
  const [nextInterceptionPoint, setNextInterceptionPoint] =
    useState<string>(NONE)

  const canSubmit = Boolean(lesson.trim() || principle.trim())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const result = await createAshMemo({
      confirmationId: confirmationId ?? null,
      lesson: lesson.trim() || null,
      principle: principle.trim() || null,
      title: String(form.get("title") ?? "") || null,
      whatHappened: String(form.get("whatHappened") ?? "") || null,
      cost: String(form.get("cost") ?? "") || null,
      skippedReason: String(form.get("skippedReason") ?? "") || null,
      ignoredFact: String(form.get("ignoredFact") ?? "") || null,
      interceptionRule: String(form.get("interceptionRule") ?? "") || null,
      domain,
      finalActionType: "custom",
      likelyMistakeKeywords: null,
      exposedWeakness:
        exposedWeakness === NONE ? null : (exposedWeakness as WeaknessKey),
      whySystemFailed:
        whySystemFailed === NONE
          ? null
          : (whySystemFailed as
              | "not_armed"
              | "not_opened"
              | "checks_too_light"
              | "skipped_confirm"
              | "rule_missed"
              | "other"),
      nextInterceptionPoint:
        nextInterceptionPoint === NONE
          ? null
          : (nextInterceptionPoint as
              | "arm_80"
              | "check_90"
              | "before_pay"
              | "before_send"
              | "before_submit"
              | "before_depart"
              | "before_commitment"),
    })
    setSubmitting(false)
    if (result && "error" in result && result.error) {
      setError(result.error)
      return
    }
    router.push("/ash-memos")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm leading-relaxed text-secondary-foreground">
        现在只需要写下教训或原则中的一个,就能立刻保存。其余内容以后方便的时候随时补。
      </p>

      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lesson">这次的教训</Label>
            <Textarea
              id="lesson"
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              maxLength={1000}
              rows={3}
              autoFocus
              placeholder="例:找多个人问同一件事,容易造成误会"
              className="text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="principle">一句话原则</Label>
            <Input
              id="principle"
              value={principle}
              onChange={(e) => setPrinciple(e.target.value)}
              maxLength={500}
              placeholder="例:同一件事只问一个人,确认后再行动"
              className="h-11 text-base"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            教训和原则,填一个就能提交。
          </p>
        </CardContent>
      </Card>

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between text-muted-foreground"
            />
          }
        >
          更多内容(可选,以后随时补)
          <ChevronDown
            className={`size-4 transition-transform ${moreOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2 py-5">
            <CardContent className="flex flex-col gap-4 px-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  name="title"
                  maxLength={200}
                  placeholder="不填会自动取教训/原则的前 30 字"
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whatHappened">这次发生了什么</Label>
                <Textarea
                  id="whatHappened"
                  name="whatHappened"
                  maxLength={2000}
                  rows={3}
                  placeholder="只写事实即可"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="interceptionRule">下次的拦截规则</Label>
                <Textarea
                  id="interceptionRule"
                  name="interceptionRule"
                  maxLength={500}
                  rows={2}
                  placeholder="填了会自动写入规则库并启用;不填以后再补也可以"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cost">代价是什么</Label>
                  <Input id="cost" name="cost" maxLength={500} className="h-11" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="skippedReason">当时为什么跳步</Label>
                  <Input
                    id="skippedReason"
                    name="skippedReason"
                    maxLength={500}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ignoredFact">忽略了什么事实</Label>
                  <Input
                    id="ignoredFact"
                    name="ignoredFact"
                    maxLength={500}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>适用场景</Label>
                  <Select
                    items={DOMAIN_LABELS}
                    value={domain}
                    onValueChange={(v) => setDomain(v as Domain)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => (
                        <SelectItem key={d} value={d}>
                          {DOMAIN_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>暴露的短板</Label>
                  <Select
                    items={{ [NONE]: "不选择", ...WEAKNESS_LABELS }}
                    value={exposedWeakness}
                    onValueChange={(v) => setExposedWeakness(v ?? NONE)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>不选择</SelectItem>
                      {(Object.keys(WEAKNESS_LABELS) as WeaknessKey[]).map(
                        (k) => (
                          <SelectItem key={k} value={k}>
                            {WEAKNESS_LABELS[k]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>系统为什么没拦住</Label>
                  <Select
                    items={{ [NONE]: "不选择", ...WHY_SYSTEM_FAILED_LABELS }}
                    value={whySystemFailed}
                    onValueChange={(v) => setWhySystemFailed(v ?? NONE)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>不选择</SelectItem>
                      {Object.entries(WHY_SYSTEM_FAILED_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>下次拦截点</Label>
                  <Select
                    items={{ [NONE]: "不选择", ...NEXT_INTERCEPTION_POINT_LABELS }}
                    value={nextInterceptionPoint}
                    onValueChange={(v) => setNextInterceptionPoint(v ?? NONE)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>不选择</SelectItem>
                      {Object.entries(NEXT_INTERCEPTION_POINT_LABELS).map(
                        ([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit || submitting}
        className="h-12 text-base"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Flame className="size-5" aria-hidden="true" />
        )}
        保存(以后随时可补充)
      </Button>
    </form>
  )
}
