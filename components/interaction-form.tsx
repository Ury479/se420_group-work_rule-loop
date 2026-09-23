"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addInteraction } from "@/app/actions/relationships"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  ENERGY_AFTER_LABELS,
  SIGNAL_TYPE_LABELS,
  BOUNDARY_SUGGESTIONS,
  type EnergyAfter,
  type SignalType,
} from "@/lib/relationships"
import { Loader2, NotebookPen, ShieldAlert } from "lucide-react"
import Link from "next/link"

export function InteractionForm({ relationshipId }: { relationshipId: number }) {
  const router = useRouter()
  const [energyAfter, setEnergyAfter] = useState<EnergyAfter>("calm")
  const [signalType, setSignalType] = useState<SignalType>("unclear")
  const [peoplePlease, setPeoplePlease] = useState(false)
  const [crossBoundary, setCrossBoundary] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needBoundaryCheck, setNeedBoundaryCheck] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const res = await addInteraction({
      relationshipId,
      interactionFact: String(form.get("interactionFact") ?? ""),
      energyAfter,
      signalType,
      didIPeoplePlease: peoplePlease,
      didICrossBoundary: crossBoundary,
      userResponse: String(form.get("userResponse") ?? "") || null,
      nextStep: String(form.get("nextStep") ?? "") || null,
    })
    setSubmitting(false)
    if ("error" in res && res.error) {
      setError(res.error)
      return
    }
    if ("needBoundaryCheck" in res && res.needBoundaryCheck) {
      setNeedBoundaryCheck(true)
      return
    }
    router.push(`/relationships/${relationshipId}`)
  }

  // 出现讨好 / 越界信号 → 引导进入底线防护检查
  if (needBoundaryCheck) {
    return (
      <Card className="border-destructive py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <p className="text-sm font-semibold">
            互动已记录。检测到讨好或越界信号,建议先做一次底线防护检查。
          </p>
          <ul className="flex flex-col gap-2">
            {BOUNDARY_SUGGESTIONS.map((s) => (
              <li
                key={s}
                className="rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed"
              >
                {s}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={<Link href={`/relationships/${relationshipId}/boundary-check`} />}
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              进入底线防护检查
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/relationships/${relationshipId}`)}
            >
              返回关系详情
            </Button>
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
            <Label htmlFor="interactionFact">发生了什么事实? *</Label>
            <Textarea
              id="interactionFact"
              name="interactionFact"
              required
              maxLength={1000}
              rows={3}
              placeholder="只写事实。例如:她临时让我帮忙做 PPT,我答应了,做到凌晨 1 点。"
            />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>互动后我的状态 *</Label>
              <Select
                items={ENERGY_AFTER_LABELS}
                value={energyAfter}
                onValueChange={(v) => setEnergyAfter(v as EnergyAfter)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENERGY_AFTER_LABELS) as EnergyAfter[]).map((e2) => (
                    <SelectItem key={e2} value={e2}>
                      {ENERGY_AFTER_LABELS[e2]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>信号类型</Label>
              <Select
                items={SIGNAL_TYPE_LABELS}
                value={signalType}
                onValueChange={(v) => setSignalType(v as SignalType)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SIGNAL_TYPE_LABELS) as SignalType[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SIGNAL_TYPE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3">
              <Checkbox
                checked={peoplePlease}
                onCheckedChange={(v) => setPeoplePlease(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">
                这次我是不是在讨好对方?(为了满足对方情绪而勉强自己)
              </span>
            </label>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={crossBoundary}
                onCheckedChange={(v) => setCrossBoundary(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">
                这次我是不是越过了自己的底线?(牺牲学业、项目、健康、金钱或时间)
              </span>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="userResponse">我当时的回应(可选)</Label>
              <Input id="userResponse" name="userResponse" maxLength={500} className="h-11" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nextStep">下一步(可选)</Label>
              <Input id="nextStep" name="nextStep" maxLength={500} className="h-11" />
            </div>
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
          <NotebookPen className="size-5" aria-hidden="true" />
        )}
        保存互动记录
      </Button>
    </form>
  )
}
