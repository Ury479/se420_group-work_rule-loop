import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  WEAKNESS_LABELS,
  WEAKNESS_INTERVENTIONS,
  SEVERITY_LABELS,
  type DetectedWeakness,
} from "@/lib/weakness"
import { ShieldAlert, ArrowRight, Anchor } from "lucide-react"

interface Props {
  detected: DetectedWeakness[]
  fallbackRule: { ruleText: string; weaknessKey: string | null } | null
  p0Locked: boolean
}

const severityClass: Record<string, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-accent text-accent-foreground",
  low: "bg-secondary text-secondary-foreground",
}

export function WeaknessDefenseCard({ detected, fallbackRule, p0Locked }: Props) {
  const top = detected.slice(0, 3)

  return (
    <section aria-label="今日弱点布防" className="flex flex-col gap-3">
      <Card className="border-primary/30 py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">今日弱点布防</h2>
            <div className="ml-auto flex items-center gap-2">
              {p0Locked && <Badge variant="destructive">P0 锁定中</Badge>}
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                nativeButton={false}
                render={<Link href="/weakness" />}
              >
                布防中心
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {top.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              今天暂未检测到明显的短板风险。保持节奏,关键动作前照常走检查。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {top.map((hit) => {
                const intervention = WEAKNESS_INTERVENTIONS[hit.weaknessKey]
                return (
                  <li
                    key={hit.weaknessKey}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {WEAKNESS_LABELS[hit.weaknessKey]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${severityClass[hit.severity]}`}
                      >
                        风险 {SEVERITY_LABELS[hit.severity]}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                      触发原因:{hit.triggerReason}
                    </p>
                    <p className="text-sm leading-relaxed text-pretty">
                      推荐动作:{hit.recommendedIntervention}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start bg-transparent"
                      nativeButton={false}
                      render={<Link href={intervention.href} />}
                    >
                      进入布防:{intervention.label}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          {fallbackRule && (
            <div className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3">
              <Anchor className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  今日兜底规则
                </span>
                <p className="text-sm leading-relaxed text-pretty">
                  {fallbackRule.ruleText}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
