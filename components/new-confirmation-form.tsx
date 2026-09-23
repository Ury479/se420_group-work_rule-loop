"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createConfirmation } from "@/app/actions/confirmations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DOMAIN_LABELS, RISK_LABELS, type Domain, type RiskLevel } from "@/lib/types"
import { Loader2, ShieldPlus } from "lucide-react"

const placeholders: Record<Domain, { mistake: string; focus: string; location: string }> = {
  study: {
    mistake: "例如:提交错文件 / 漏看格式要求",
    focus: "例如:平台、文件名、文件内容、Submit 成功页",
    location: "例如:Canvas / Teams / 教室 A302",
  },
  purchase: {
    mistake: "例如:月付看成年付 / 自动续费没看清",
    focus: "例如:金额、周期、币种、自动续费、退款规则",
    location: "例如:官网付款页 / App Store",
  },
  relationship: {
    mistake: "例如:发错对象 / 语气不合适 / 情绪化发送",
    focus: "例如:对象、目的、语气、发送时机",
    location: "例如:微信 / 邮件 / Teams",
  },
  custom: {
    mistake: "例如:最容易错的一步是什么?",
    focus: "例如:最后确认时必须看什么?",
    location: "例如:机场 T2 / 签证中心",
  },
}

export function NewConfirmationForm({ initialDomain }: { initialDomain: Domain }) {
  const router = useRouter()
  const [domain, setDomain] = useState<Domain>(initialDomain)
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("medium")
  const [evidenceRequired, setEvidenceRequired] = useState(false)
  const [mistakeHistory, setMistakeHistory] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const result = await createConfirmation({
      title: String(form.get("title") ?? ""),
      domain,
      scenario: String(form.get("scenario") ?? "") || null,
      eventTime: String(form.get("eventTime") ?? "") || null,
      deadline: String(form.get("deadline") ?? "") || null,
      locationOrPlatform: String(form.get("locationOrPlatform") ?? "") || null,
      targetPerson: String(form.get("targetPerson") ?? "") || null,
      riskLevel,
      costIfFailed: String(form.get("costIfFailed") ?? "") || null,
      likelyMistake: String(form.get("likelyMistake") ?? "") || null,
      finalCheckFocus: String(form.get("finalCheckFocus") ?? "") || null,
      evidenceRequired,
      mistakeHistory,
      notes: String(form.get("notes") ?? "") || null,
      finalActionType: "custom",
      currentState: "normal",
      isQuickCheck: false,
    })
    setSubmitting(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("id" in result) {
      router.push(`/critical-confirmations/${result.id}/check`)
    }
  }

  const p = placeholders[domain]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">任务名称 *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="例如:提交 Ethics 作业"
              className="h-11"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>场景 *</Label>
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
              <Label htmlFor="scenario">子场景</Label>
              <Input
                id="scenario"
                name="scenario"
                maxLength={200}
                placeholder="例如:作业提交 / 会员订阅"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="eventTime">执行时间</Label>
              <Input id="eventTime" name="eventTime" type="datetime-local" className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deadline">截止时间</Label>
              <Input id="deadline" name="deadline" type="datetime-local" className="h-11" />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="locationOrPlatform">地点 / 平台</Label>
              <Input
                id="locationOrPlatform"
                name="locationOrPlatform"
                maxLength={300}
                placeholder={p.location}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="targetPerson">对象</Label>
              <Input
                id="targetPerson"
                name="targetPerson"
                maxLength={200}
                placeholder="例如:王老师 / 导员"
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="flex flex-col gap-2">
            <Label>代价等级 *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(RISK_LABELS) as RiskLevel[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskLevel(r)}
                  aria-pressed={riskLevel === r}
                  className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                    riskLevel === r
                      ? r === "high"
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {RISK_LABELS[r]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              涉及成绩、金钱、签证、老师、不可退款等情况时,系统会自动升级为高风险。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="costIfFailed">失败代价</Label>
            <Input
              id="costIfFailed"
              name="costIfFailed"
              maxLength={500}
              placeholder="例如:影响成绩 / 损失金钱 / 不可重交"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="likelyMistake">最容易出错的点</Label>
            <Input
              id="likelyMistake"
              name="likelyMistake"
              maxLength={500}
              placeholder={p.mistake}
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="finalCheckFocus">最后确认时必须检查什么</Label>
            <Input
              id="finalCheckFocus"
              name="finalCheckFocus"
              maxLength={500}
              placeholder={p.focus}
              className="h-11"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <Label htmlFor="evidenceRequired" className="cursor-pointer">
              需要留下最小证据
            </Label>
            <Switch
              id="evidenceRequired"
              checked={evidenceRequired}
              onCheckedChange={setEvidenceRequired}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <Label htmlFor="mistakeHistory" className="cursor-pointer">
              曾经在类似场景出错
            </Label>
            <Switch
              id="mistakeHistory"
              checked={mistakeHistory}
              onCheckedChange={setMistakeHistory}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea id="notes" name="notes" maxLength={1000} rows={3} placeholder="其他需要记住的信息" />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="h-12 text-base">
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldPlus className="size-5" aria-hidden="true" />
        )}
        完成布防,生成确认清单
      </Button>
    </form>
  )
}
