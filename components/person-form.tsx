"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPerson } from "@/app/actions/people-resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { RELATIONSHIP_TYPES, RELATIONSHIP_STAGES } from "@/lib/resource-types"

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: string; label: string }[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div role="group" aria-label={label} className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === o.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PersonForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [personName, setPersonName] = useState("")
  const [relationshipType, setRelationshipType] = useState<string | null>(null)
  const [relationshipStage, setRelationshipStage] = useState("initial_contact")
  const [availableHelp, setAvailableHelp] = useState("")
  const [valueICanOffer, setValueICanOffer] = useState("")
  const [showOptional, setShowOptional] = useState(false)
  const [suitableTopics, setSuitableTopics] = useState("")
  const [unsuitableTopics, setUnsuitableTopics] = useState("")
  const [boundaryNotes, setBoundaryNotes] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createPerson({
        personName: personName.trim(),
        relationshipType,
        domain: null,
        relationshipStage,
        availableHelp: availableHelp.trim() || null,
        valueICanOffer: valueICanOffer.trim() || null,
        suitableTopics: suitableTopics.trim() || null,
        unsuitableTopics: unsuitableTopics.trim() || null,
        suggestedFrequency: null,
        boundaryNotes: boundaryNotes.trim() || null,
      })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      router.push("/resources/people")
    } catch {
      setError("保存失败:服务器暂时不可用,请稍后重试。填写内容仍在表单中。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-name">
          姓名 / 称呼 <span className="text-destructive">*</span>
        </Label>
        <Input id="p-name" required value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="例:张老师" />
      </div>

      <PillGroup label="关系类型" options={RELATIONSHIP_TYPES} value={relationshipType} onChange={setRelationshipType} />
      <PillGroup label="当前关系阶段" options={RELATIONSHIP_STAGES} value={relationshipStage} onChange={setRelationshipStage} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-help">对方可提供的帮助</Label>
        <Textarea
          id="p-help"
          value={availableHelp}
          onChange={(e) => setAvailableHelp(e.target.value)}
          placeholder="例:论文指导、行业信息、内推机会"
          className="min-h-20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-value">我能提供的价值</Label>
        <Textarea
          id="p-value"
          value={valueICanOffer}
          onChange={(e) => setValueICanOffer(e.target.value)}
          placeholder="例:整理会议纪要、技术调研、及时反馈进展"
          className="min-h-20"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        aria-expanded={showOptional}
      >
        {showOptional ? "收起可选信息" : "补充可选信息(话题边界、注意事项)"}
      </button>
      {showOptional && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-suitable">适合讨论的话题</Label>
            <Input id="p-suitable" value={suitableTopics} onChange={(e) => setSuitableTopics(e.target.value)} placeholder="例:学术、技术、职业规划" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-unsuitable">不适合讨论的话题</Label>
            <Input id="p-unsuitable" value={unsuitableTopics} onChange={(e) => setUnsuitableTopics(e.target.value)} placeholder="例:私人生活、薪资" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-boundary">边界与注意事项</Label>
            <Textarea
              id="p-boundary"
              value={boundaryNotes}
              onChange={(e) => setBoundaryNotes(e.target.value)}
              placeholder="例:工作日晚上不打扰;求助前先自己尝试"
              className="min-h-20"
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting || !personName.trim()} className="w-full">
        {submitting ? "保存中…" : "登记联系人"}
      </Button>
    </form>
  )
}
