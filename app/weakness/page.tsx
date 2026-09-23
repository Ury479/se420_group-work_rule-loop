import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WeaknessDefenseCard } from "@/components/weakness-defense-card"
import { WeaknessEventList } from "@/components/weakness-event-list"
import {
  detectTodayWeaknesses,
  getWeaknessEvents,
  getWeaknessStats,
} from "@/app/actions/weakness"
import {
  SYSTEM_MOTTO,
  WEAKNESS_LABELS,
  WEAKNESS_DESCRIPTIONS,
  WEAKNESS_INTERVENTIONS,
  WEAKNESS_SEED_RULES,
  type WeaknessKey,
} from "@/lib/weakness"
import { ListTodo, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "弱点布防中心 | 关键动作拦截台",
  description: "识别贪多、急躁、跳步、讨好、冲动消费、多线分散六类短板,提前布防。",
}

const ALL_KEYS = Object.keys(WEAKNESS_LABELS) as WeaknessKey[]

export default async function WeaknessCenterPage() {
  const [{ detected, lock, fallbackRule }, events, stats] = await Promise.all([
    detectTodayWeaknesses(),
    getWeaknessEvents("open"),
    getWeaknessStats(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          弱点布防中心
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {SYSTEM_MOTTO} 识别短板,提前布防,用系统兜底,而不是依赖情绪和意志力。
        </p>
      </header>

      <WeaknessDefenseCard
        detected={detected}
        fallbackRule={fallbackRule}
        p0Locked={lock.locked}
      />

      {/* 需求 Backlog 入口 */}
      <Card className="py-5">
        <CardContent className="flex flex-col items-start justify-between gap-4 px-5 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <h2 className="font-semibold">需求与 Backlog</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              P0 未完成前,新增需求默认进入 Backlog。防止新增需求替代执行。
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/demands" />}>
            <ListTodo className="size-4" aria-hidden="true" />
            管理需求
          </Button>
        </CardContent>
      </Card>

      {/* 未处理的弱点事件 */}
      {events.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            未处理的弱点事件 · {events.length}
          </h2>
          <WeaknessEventList events={events} />
        </section>
      )}

      {/* 6 类短板画像 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          六类核心短板
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {ALL_KEYS.map((key) => (
            <Card key={key} className="py-4">
              <CardContent className="flex flex-col gap-2 px-5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{WEAKNESS_LABELS[key]}</span>
                  {stats[key] ? (
                    <span className="text-xs text-muted-foreground">
                      近 30 天出现 {stats[key]} 次
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {WEAKNESS_DESCRIPTIONS[key]}
                </p>
                <p className="text-sm leading-relaxed text-pretty">
                  兜底规则:{WEAKNESS_SEED_RULES[key]}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 self-start bg-transparent"
                  nativeButton={false}
                  render={<Link href={WEAKNESS_INTERVENTIONS[key].href} />}
                >
                  {WEAKNESS_INTERVENTIONS[key].label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
