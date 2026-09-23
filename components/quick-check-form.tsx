"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createQuickCheck } from "@/app/actions/intercept"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CURRENT_STATE_LABELS,
  DOMAIN_LABELS,
  FINAL_ACTION_LABELS,
  type CurrentState,
  type Domain,
  type FinalActionType,
} from "@/lib/types"
import {
  BACKUP_PATH_LIBRARY,
  STABILIZE_COPY,
  STABILIZE_QUESTIONS,
  DRAFT_FIRST_COPY,
} from "@/lib/templates"
import { AlertTriangle, ChevronDown, Loader2, OctagonPause, Zap } from "lucide-react"

interface StabilizeState {
  confirmationId: number
  matchedRules: string[]
  keyPerson: boolean
}

export function QuickCheckForm({
  initialAction,
}: {
  initialAction: FinalActionType
}) {
  const router = useRouter()
  const [finalActionType, setFinalActionType] = useState(initialAction)
  const [domain, setDomain] = useState<Domain>(
    initialAction === "pay" ? "purchase" : initialAction === "send" ? "relationship" : "study"
  )
  const [currentState, setCurrentState] = useState<CurrentState>("normal")
  const [showMore, setShowMore] = useState(false)
  const [evidenceRequired, setEvidenceRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 稳定模式:高风险任务在进入检查前必须过 3 问
  const [stabilize, setStabilize] = useState<StabilizeState | null>(null)
  const [stabilizeChecked, setStabilizeChecked] = useState<boolean[]>([
    false,
    false,
    false,
  ])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const result = await createQuickCheck({
      finalActionType,
      title: String(form.get("title") ?? ""),
      costIfFailed: String(form.get("costIfFailed") ?? ""),
      likelyMistake: String(form.get("likelyMistake") ?? ""),
      finalCheckFocus: String(form.get("finalCheckFocus") ?? ""),
      currentState,
      backupPath: String(form.get("backupPath") ?? "") || null,
      evidenceRequired,
      targetPerson: String(form.get("targetPerson") ?? "") || null,
      domain,
    })
    setSubmitting(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("id" in result) {
      if (result.needsStabilize) {
        setStabilize({
          confirmationId: result.id,
          matchedRules: result.matchedRules,
          keyPerson: result.keyPerson,
        })
      } else {
        router.push(`/critical-confirmations/${result.id}/check`)
      }
    }
  }

  // ---------- 稳定模式界面 ----------
  if (stabilize) {
    const allChecked = stabilizeChecked.every(Boolean)
    return (
      <div className="flex flex-col gap-5">
        <Card className="border-destructive py-5">
          <CardContent className="flex flex-col gap-4 px-5">
            <div className="flex items-center gap-2">
              <OctagonPause
                className="size-5 text-destructive"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">稳定模式</h2>
            </div>
            <p className="text-sm leading-relaxed text-pretty">
              {STABILIZE_COPY}
            </p>
            <div className="flex flex-col gap-3">
              {STABILIZE_QUESTIONS.map((q, i) => (
                <label
                  key={q}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <Checkbox
                    checked={stabilizeChecked[i]}
                    onCheckedChange={(v) =>
                      setStabilizeChecked((prev) => {
                        const next = [...prev]
                        next[i] = v === true
                        return next
                      })
                    }
                    className="size-5"
                  />
                  <span className="text-sm leading-relaxed">{q}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {stabilize.keyPerson && (
          <Card className="border-destructive/50 bg-destructive/5 py-4">
            <CardContent className="flex items-start gap-3 px-5">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium leading-relaxed">
                你正在联系关键对象。{DRAFT_FIRST_COPY}
              </p>
            </CardContent>
          </Card>
        )}

        {stabilize.matchedRules.length > 0 && (
          <Card className="border-primary py-4">
            <CardContent className="flex flex-col gap-2 px-5">
              <p className="text-sm font-semibold">
                根据历史教训,本次已自动加入以下拦截规则:
              </p>
              <ul className="flex flex-col gap-2">
                {stabilize.matchedRules.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button
          size="lg"
          disabled={!allChecked}
          onClick={() =>
            router.push(
              `/critical-confirmations/${stabilize.confirmationId}/check`
            )
          }
          className="h-12 text-base"
        >
          我已停下来,进入正式检查
        </Button>
      </div>
    )
  }

  // ---------- 快速检查表单 ----------
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>关键动作</Label>
              <Select
                items={FINAL_ACTION_LABELS}
                value={finalActionType}
                onValueChange={(v) => setFinalActionType(v as FinalActionType)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FINAL_ACTION_LABELS) as FinalActionType[]).map(
                    (a) => (
                      <SelectItem key={a} value={a}>
                        {FINAL_ACTION_LABELS[a]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>场景</Label>
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
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">我准备{FINAL_ACTION_LABELS[finalActionType]}什么? *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="例如:提交 Ethics 作业 / 支付年费会员"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="costIfFailed">1. 这件事错了会有什么代价? *</Label>
            <Input
              id="costIfFailed"
              name="costIfFailed"
              required
              maxLength={500}
              placeholder="例如:不可重交 / 不可退款 / 影响关系"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="likelyMistake">2. 我现在最容易跳过哪一步? *</Label>
            <Input
              id="likelyMistake"
              name="likelyMistake"
              required
              maxLength={500}
              placeholder="例如:没有重新看要求 / 没核对金额"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="finalCheckFocus">
              3. 执行前我必须重新确认什么? *
            </Label>
            <Input
              id="finalCheckFocus"
              name="finalCheckFocus"
              required
              maxLength={500}
              placeholder="例如:文件版本 / 收件人 / 自动续费条款"
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {showMore ? "收起更多字段" : "展开更多字段(状态 / 备用方案 / 证据)"}
      </button>

      {showMore && (
        <Card className="py-5">
          <CardContent className="flex flex-col gap-5 px-5">
            <div className="flex flex-col gap-2">
              <Label>当前状态</Label>
              <Select
                items={CURRENT_STATE_LABELS}
                value={currentState}
                onValueChange={(v) => setCurrentState(v as CurrentState)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CURRENT_STATE_LABELS) as CurrentState[]).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {CURRENT_STATE_LABELS[s]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                状态不稳时,系统会自动提升风险等级并进入稳定模式。
              </p>
            </div>

            {(finalActionType === "send" || domain === "relationship") && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="targetPerson">发送对象</Label>
                <Input
                  id="targetPerson"
                  name="targetPerson"
                  maxLength={200}
                  placeholder="例如:王老师 / 导员 / 合作方"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  老师、导员、签证人员、合作方、老板等关键对象自动升级为高风险。
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="backupPath">备用方案 / 备用路径</Label>
              <Textarea
                id="backupPath"
                name="backupPath"
                maxLength={1000}
                rows={3}
                placeholder={BACKUP_PATH_LIBRARY[domain].join(";")}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <Label htmlFor="evidenceRequired" className="cursor-pointer">
                是否需要证据
              </Label>
              <Switch
                id="evidenceRequired"
                checked={evidenceRequired}
                onCheckedChange={setEvidenceRequired}
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

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="h-12 text-base"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Zap className="size-5" aria-hidden="true" />
        )}
        开始检查
      </Button>
    </form>
  )
}
