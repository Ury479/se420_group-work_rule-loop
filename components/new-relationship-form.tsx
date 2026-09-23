"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { quickScreen, deepScreen } from "@/app/actions/relationships"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  NET_IMPACT_LABELS,
  NEXT_ACTION_LABELS,
  ENERGY_AFTER_LABELS,
  RECIPROCITY_LABELS,
  STATUS_SUGGESTIONS,
  type RelationshipType,
  type RelationshipStatus,
  type NetImpact,
  type EnergyAfter,
  type ReciprocityLevel,
  type NextAction,
} from "@/lib/relationships"
import { ChevronDown, Loader2, Zap, UserPlus } from "lucide-react"

type Mode = "quick" | "deep"

export function NewRelationshipForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("other")
  const [energyAfter, setEnergyAfter] = useState<EnergyAfter>("calm")
  const [netImpact, setNetImpact] = useState<NetImpact>("uncertain")
  const [reciprocity, setReciprocity] = useState<ReciprocityLevel>("balanced")
  const [nextAction, setNextAction] = useState<NextAction>("observe")
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    status: RelationshipStatus
    id: number
  } | null>(null)

  async function handleQuickSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const res = await quickScreen({
      personName: String(form.get("personName") ?? ""),
      relationshipType,
      interactionFact: String(form.get("interactionFact") ?? ""),
      energyAfter,
      impactNote: String(form.get("impactNote") ?? "") || null,
      signalNote: String(form.get("signalNote") ?? "") || null,
      nextAction: null,
    })
    setSubmitting(false)
    if ("error" in res && res.error) {
      setError(res.error)
      return
    }
    if ("id" in res && res.id) {
      setResult({ status: res.status as RelationshipStatus, id: res.id })
    }
  }

  async function handleDeepSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const score = (name: string) => {
      const v = String(form.get(name) ?? "")
      return v ? Number(v) : null
    }
    const res = await deepScreen({
      personName: String(form.get("personName") ?? ""),
      relationshipType,
      recentInteractionFact: String(form.get("recentInteractionFact") ?? ""),
      netImpact,
      careerImpactScore: score("careerImpactScore"),
      workImpactScore: score("workImpactScore"),
      emotionImpactScore: score("emotionImpactScore"),
      growthImpactScore: score("growthImpactScore"),
      reciprocityLevel: reciprocity,
      nextAction,
      coreNeedHypothesis: String(form.get("coreNeedHypothesis") ?? "") || null,
      sensitivePoints: String(form.get("sensitivePoints") ?? "") || null,
      communicationLandmines: String(form.get("communicationLandmines") ?? "") || null,
      keySignals: String(form.get("keySignals") ?? "") || null,
      boundaryNotes: String(form.get("boundaryNotes") ?? "") || null,
      notes: null,
    })
    setSubmitting(false)
    if ("error" in res && res.error) {
      setError(res.error)
      return
    }
    if ("id" in res && res.id) {
      setResult({ status: res.status as RelationshipStatus, id: res.id })
    }
  }

  // 筛查结果:状态初判 + 建议(基于事实,不贴标签)
  if (result) {
    return (
      <Card className="border-primary py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">当前关系状态初判</p>
            <p className="text-lg font-semibold">
              {RELATIONSHIP_STATUS_LABELS[result.status]}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {STATUS_SUGGESTIONS[result.status].map((s) => (
              <li
                key={s}
                className="rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed"
              >
                {s}
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">
            以上为基于你记录的事实做出的初判,不是对人的评价。继续观察,不要急着贴标签。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.push(`/relationships/${result.id}`)}>
              查看关系详情
            </Button>
            <Button variant="outline" onClick={() => router.push("/relationships")}>
              返回筛查台
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const typeSelect = (
    <div className="flex flex-col gap-2">
      <Label>关系类型 *</Label>
      <Select
        items={RELATIONSHIP_TYPE_LABELS}
        value={relationshipType}
        onValueChange={(v) => setRelationshipType(v as RelationshipType)}
      >
        <SelectTrigger className="h-11 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(RELATIONSHIP_TYPE_LABELS) as RelationshipType[]).map((t) => (
            <SelectItem key={t} value={t}>
              {RELATIONSHIP_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* 模式切换 */}
      <div className="flex gap-2" role="tablist" aria-label="筛查模式">
        <Button
          role="tab"
          aria-selected={mode === "quick"}
          variant={mode === "quick" ? "default" : "outline"}
          onClick={() => setMode("quick")}
        >
          <Zap className="size-4" aria-hidden="true" />
          快速筛查(3 问)
        </Button>
        <Button
          role="tab"
          aria-selected={mode === "deep"}
          variant={mode === "deep" ? "default" : "outline"}
          onClick={() => setMode("deep")}
        >
          <UserPlus className="size-4" aria-hidden="true" />
          深度筛查
        </Button>
      </div>

      {mode === "quick" ? (
        <form onSubmit={handleQuickSubmit} className="flex flex-col gap-5">
          <Card className="py-5">
            <CardContent className="flex flex-col gap-5 px-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="personName">1. 这个人是谁? *</Label>
                  <Input
                    id="personName"
                    name="personName"
                    required
                    maxLength={100}
                    placeholder="称呼即可,例如:王老师 / 小组同学 A"
                    className="h-11"
                  />
                </div>
                {typeSelect}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="interactionFact">2. 最近一次互动发生了什么事实? *</Label>
                <Textarea
                  id="interactionFact"
                  name="interactionFact"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="只写事实,不写评价。例如:他主动帮我改了简历,并介绍了一个实习机会。"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>3. 互动后,我的状态是? *</Label>
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
            {showOptional ? "收起可选信息" : "补充可选信息(最多 2 项)"}
          </button>

          {showOptional && (
            <Card className="py-5">
              <CardContent className="flex flex-col gap-5 px-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="impactNote">
                    这段关系对我的事业 / 工作 / 情绪 / 发展有什么影响?
                  </Label>
                  <Textarea id="impactNote" name="impactNote" maxLength={500} rows={2} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signalNote">
                    这次互动有没有出现让我不舒服或值得注意的信号?
                  </Label>
                  <Textarea id="signalNote" name="signalNote" maxLength={500} rows={2} />
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
              <Zap className="size-5" aria-hidden="true" />
            )}
            完成快速筛查
          </Button>
        </form>
      ) : (
        <form onSubmit={handleDeepSubmit} className="flex flex-col gap-5">
          <Card className="py-5">
            <CardContent className="flex flex-col gap-5 px-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="personName">对方称呼 *</Label>
                  <Input
                    id="personName"
                    name="personName"
                    required
                    maxLength={100}
                    className="h-11"
                  />
                </div>
                {typeSelect}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="recentInteractionFact">最近互动事实 *</Label>
                <Textarea
                  id="recentInteractionFact"
                  name="recentInteractionFact"
                  required
                  maxLength={1000}
                  rows={3}
                  placeholder="只写事实,不写评价。"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label>关系净影响</Label>
                  <Select
                    items={NET_IMPACT_LABELS}
                    value={netImpact}
                    onValueChange={(v) => setNetImpact(v as NetImpact)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(NET_IMPACT_LABELS) as NetImpact[]).map((n) => (
                        <SelectItem key={n} value={n}>
                          {NET_IMPACT_LABELS[n]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>互惠程度</Label>
                  <Select
                    items={RECIPROCITY_LABELS}
                    value={reciprocity}
                    onValueChange={(v) => setReciprocity(v as ReciprocityLevel)}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RECIPROCITY_LABELS) as ReciprocityLevel[]).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {RECIPROCITY_LABELS[r]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <fieldset className="flex flex-col gap-3">
                <legend className="text-sm font-medium">
                  影响评分(1-5,评估的是关系状态,不是给人打分)
                </legend>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {(
                    [
                      ["careerImpactScore", "事业"],
                      ["workImpactScore", "工作"],
                      ["emotionImpactScore", "情绪"],
                      ["growthImpactScore", "成长"],
                    ] as const
                  ).map(([name, label]) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <Label htmlFor={name} className="text-xs text-muted-foreground">
                        {label}
                      </Label>
                      <Input
                        id={name}
                        name={name}
                        type="number"
                        min={1}
                        max={5}
                        placeholder="1-5"
                        className="h-10"
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-col gap-2">
                <Label>下一步行动</Label>
                <Select
                  items={NEXT_ACTION_LABELS}
                  value={nextAction}
                  onValueChange={(v) => setNextAction(v as NextAction)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NEXT_ACTION_LABELS) as NextAction[]).map((a) => (
                      <SelectItem key={a} value={a}>
                        {NEXT_ACTION_LABELS[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            {showOptional ? "收起推测信息" : "补充推测信息(全部标记为推测)"}
          </button>

          {showOptional && (
            <Card className="py-5">
              <CardContent className="flex flex-col gap-5 px-5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  以下内容均为推测,不是确定结论。目的是避免误伤、误判和不必要冲突,保持谦逊。
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="coreNeedHypothesis">对方核心诉求(推测)</Label>
                  <Input
                    id="coreNeedHypothesis"
                    name="coreNeedHypothesis"
                    maxLength={500}
                    placeholder="例如:效率 / 尊重 / 资源 / 情绪支持 / 结果 / 确定性"
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sensitivePoints">敏感点 / 压力点(推测)</Label>
                  <Input
                    id="sensitivePoints"
                    name="sensitivePoints"
                    maxLength={500}
                    placeholder="例如:时间 / 责任 / 面子 / 边界 / 利益分配 / 被质疑"
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="communicationLandmines">沟通雷区(推测)</Label>
                  <Input
                    id="communicationLandmines"
                    name="communicationLandmines"
                    maxLength={500}
                    placeholder="例如:避免越级承诺、避免深夜发送复杂消息"
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="keySignals">最近出现的关键信号</Label>
                  <Input
                    id="keySignals"
                    name="keySignals"
                    maxLength={500}
                    placeholder="例如:主动支持 / 频繁索取 / 忽视边界 / 回避责任"
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="boundaryNotes">我的底线和边界</Label>
                  <Input
                    id="boundaryNotes"
                    name="boundaryNotes"
                    maxLength={500}
                    placeholder="例如:不牺牲学业时间;不做超出能力的承诺"
                    className="h-11"
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
              <UserPlus className="size-5" aria-hidden="true" />
            )}
            完成深度筛查
          </Button>
        </form>
      )}
    </div>
  )
}
