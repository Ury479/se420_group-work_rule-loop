"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { submitReview } from "@/app/actions/evidence-review"
import { STATE_LABELS, RISK_LABELS, type StateWhenError, type RiskLevel } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ReviewForm({ confirmationId }: { confirmationId?: number }) {
  const router = useRouter()
  const [mistakeType, setMistakeType] = useState("")
  const [loss, setLoss] = useState("")
  const [skippedStep, setSkippedStep] = useState("")
  const [stateWhenError, setStateWhenError] = useState<StateWhenError>("rushed")
  const [principleText, setPrincipleText] = useState("")
  const [newRule, setNewRule] = useState("")
  const [costLevel, setCostLevel] = useState<RiskLevel>("medium")
  const [writeToReviewSystem, setWriteToReviewSystem] = useState(true)
  const [generateRule, setGenerateRule] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!mistakeType.trim()) {
      setError("请填写这次错误是什么")
      return
    }
    if (generateRule && !newRule.trim()) {
      setError("已勾选生成拦截规则,请填写新规则内容")
      return
    }
    setSubmitting(true)
    const result = await submitReview({
      confirmationId: confirmationId ?? null,
      mistakeType: mistakeType.trim(),
      loss: loss.trim() || null,
      skippedStep: skippedStep.trim() || null,
      stateWhenError,
      principleText: principleText.trim() || null,
      newRule: newRule.trim() || null,
      costLevel,
      writeToReviewSystem,
      generateRule,
    })
    setSubmitting(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("ruleId" in result && result.ruleId) {
      router.push(`/rules/${result.ruleId}/confirm`)
    } else {
      router.push("/")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 事实</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mistake-type">这次错误是什么?</Label>
            <Textarea
              id="mistake-type"
              value={mistakeType}
              onChange={(e) => setMistakeType(e.target.value)}
              placeholder="例:交错了作业版本,交的是没改完的旧文件"
              rows={2}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="loss">损失是什么?</Label>
            <Input
              id="loss"
              value={loss}
              onChange={(e) => setLoss(e.target.value)}
              placeholder="例:作业按迟交处理,扣 20%"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>损失等级</Label>
            <Select
              items={RISK_LABELS}
              value={costLevel}
              onValueChange={(v) => setCostLevel(v as RiskLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RISK_LABELS) as RiskLevel[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {RISK_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 原因</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="skipped-step">我跳过了哪一步确认?</Label>
            <Input
              id="skipped-step"
              value={skippedStep}
              onChange={(e) => setSkippedStep(e.target.value)}
              placeholder="例:没有打开文件重新看最后一页"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>当时的状态</Label>
            <Select
              items={STATE_LABELS}
              value={stateWhenError}
              onValueChange={(v) => setStateWhenError(v as StateWhenError)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATE_LABELS) as StateWhenError[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {STATE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. 改进</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="principle">一句话原则</Label>
            <Input
              id="principle"
              value={principleText}
              onChange={(e) => setPrincipleText(e.target.value)}
              placeholder="例:赶时间的时候,更要慢 30 秒"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-rule">新的拦截规则</Label>
            <Textarea
              id="new-rule"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="例:凡是交作业,提交前必须重新打开文件确认版本号"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">生成拦截规则</span>
              <span className="text-xs text-muted-foreground">
                提交后进入规则确认页,确认后才会生效
              </span>
            </div>
            <Switch checked={generateRule} onCheckedChange={setGenerateRule} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">写入复盘系统</span>
              <span className="text-xs text-muted-foreground">
                保存到错误复盘记录,供以后回顾
              </span>
            </div>
            <Switch
              checked={writeToReviewSystem}
              onCheckedChange={setWriteToReviewSystem}
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitting} className="h-12">
        {submitting ? "提交中..." : "提交复盘"}
      </Button>
    </form>
  )
}
