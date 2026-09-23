"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  saveEvidence,
  appendEvidence,
  completeWithoutEvidence,
} from "@/app/actions/evidence-review"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EVIDENCE_TYPE_LABELS, type EvidenceType } from "@/lib/types"
import { Loader2, CircleCheckBig, ChevronDown, ChevronUp, ArrowRight } from "lucide-react"

export function EvidenceForm({
  confirmationId,
  supplementMode = false,
}: {
  confirmationId: number
  /** 事后补充模式:只追加证据,不改变任务状态 */
  supplementMode?: boolean
}) {
  const router = useRouter()
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("note")
  const [evidenceText, setEvidenceText] = useState("")
  const [note, setNote] = useState("")
  const [showMore, setShowMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!evidenceText.trim()) {
      setError("留一句话即可,例如文件名或订单号")
      return
    }
    setError(null)
    setSubmitting(true)
    const action = supplementMode ? appendEvidence : saveEvidence
    const result = await action({
      confirmationId,
      evidenceType,
      evidenceText: evidenceText.trim(),
      note: note.trim() || null,
    })
    setSubmitting(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    router.push("/")
  }

  async function handleSkip() {
    setSkipping(true)
    await completeWithoutEvidence(confirmationId)
    setSkipping(false)
    router.push("/")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 唯一必填项:一句话证据 */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="evidenceText" className="text-base">
          留一句话证据
        </Label>
        <Textarea
          id="evidenceText"
          rows={3}
          maxLength={2000}
          value={evidenceText}
          onChange={(e) => setEvidenceText(e.target.value)}
          placeholder="例如:ethics_final_v3.pdf / 订单 #1234 / 已看到提交成功页"
          className="text-base"
          autoFocus
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          现在只需要这一条最重要的信息,其余内容以后随时可以补。
        </p>
      </div>

      {/* 可选项折叠 */}
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {showMore ? (
          <ChevronUp className="size-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
        更多选项(可选)
      </button>

      {showMore && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-2">
            <Label>证据类型</Label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {(Object.keys(EVIDENCE_TYPE_LABELS) as EvidenceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEvidenceType(t)}
                  aria-pressed={evidenceType === t}
                  className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                    evidenceType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {EVIDENCE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">简短备注</Label>
            <Input
              id="note"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选"
              className="h-10"
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting || skipping} className="h-12 text-base">
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <CircleCheckBig className="size-5" aria-hidden="true" />
        )}
        {supplementMode ? "保存补充证据" : "保存并完成"}
      </Button>

      {!supplementMode && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={submitting || skipping}
          onClick={handleSkip}
          className="h-11 text-muted-foreground"
        >
          {skipping ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          先完成,证据以后再补
        </Button>
      )}
    </form>
  )
}
