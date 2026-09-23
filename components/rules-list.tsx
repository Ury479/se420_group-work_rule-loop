"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, FileText, Search, ShieldAlert, ShieldCheck, Target } from "lucide-react"
import { setRuleActive, deleteRule } from "@/app/actions/rules"
import { DOMAIN_LABELS, STATE_LABELS, type Domain, type StateWhenError } from "@/lib/types"
import { WEAKNESS_LABELS, type WeaknessKey } from "@/lib/weakness"
import { HudPanel, IconTile, MeterBar, StatusPill, toneText, type HudTone } from "@/components/hud"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type Rule = {
  id: number
  domain: string
  scenario: string | null
  ruleText: string
  principleText: string | null
  isActive: boolean
  weaknessKey?: string | null
  hitCount?: number
  status?: string
  severity?: string
  currentVersion?: number
  matchCount?: number
  actedCount?: number
  validatedCount?: number
  helpfulCount?: number
  createdAt: Date
}

const ALL = "all"

type Review = {
  id: number
  mistakeType: string
  loss: string | null
  stateWhenError: string | null
  costLevel: string
  createdAt: Date
}

// 证据成色决定整张卡的语义色:验证够多且有效 → 绿;有验证但不足 → 紫;其余 → 金(需要调整)
function evidenceOf(rule: Rule): { tone: HudTone; label: string; icon: typeof ShieldCheck } {
  const validated = rule.validatedCount ?? 0
  const helpful = rule.helpfulCount ?? 0
  if (validated >= 3 && helpful > 0) return { tone: "green", label: `有效 · ${validated}次验证`, icon: ShieldCheck }
  if (validated > 0) return { tone: "purple", label: `待观察 · ${validated}次`, icon: Search }
  return { tone: "gold", label: "需要调整 · 待验证", icon: ShieldAlert }
}

export function RulesList({ rules, reviews }: { rules: Rule[]; reviews: Review[] }) {
  const [tab, setTab] = useState<"rules" | "reviews">("rules")
  const [weaknessFilter, setWeaknessFilter] = useState<string>(ALL)

  const usedWeaknessKeys = Array.from(
    new Set(rules.map((r) => r.weaknessKey).filter((k): k is string => Boolean(k && k in WEAKNESS_LABELS))),
  )

  const filteredRules = weaknessFilter === ALL ? rules : rules.filter((r) => r.weaknessKey === weaknessFilter)

  return (
    <div className="flex flex-col gap-5">
      {/* 主分区:参考 HUD 的下划线标签,而不是按钮组 */}
      <div role="tablist" aria-label="规则库分区" className="flex gap-6 border-b border-border">
        {(
          [
            ["rules", `拦截规则 ${rules.length}`],
            ["reviews", `复盘记录 ${reviews.length}`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-1 text-sm font-semibold transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "rules" && usedWeaknessKeys.length > 0 ? (
        <div className="scrollbar-none flex gap-2 overflow-x-auto" role="group" aria-label="按短板筛选">
          {[[ALL, "全部"] as const, ...usedWeaknessKeys.map((k) => [k, WEAKNESS_LABELS[k as WeaknessKey]] as const)].map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={weaknessFilter === key}
                onClick={() => setWeaknessFilter(key)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors",
                  weaknessFilter === key
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>
      ) : null}

      {tab === "rules" ? (
        filteredRules.length === 0 && rules.length > 0 ? (
          <HudPanel className="py-10 text-center">
            <p className="text-sm text-muted-foreground">这个短板下还没有规则。</p>
          </HudPanel>
        ) : rules.length === 0 ? (
          <HudPanel className="flex flex-col items-center gap-4 py-10 text-center">
            <IconTile icon={FileText} tone="gold" className="size-12" />
            <p className="text-sm text-muted-foreground">还没有拦截规则。规则来自错误复盘,也可以在复盘后自动生成。</p>
            <Link
              href="/reviews/new"
              className="inline-flex min-h-11 items-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary"
            >
              去做一次复盘
            </Link>
          </HudPanel>
        ) : (
          <ul className="flex flex-col gap-3">
            {filteredRules.map((rule, index) => (
              <li key={rule.id}>
                <RuleCard rule={rule} index={index + 1} />
              </li>
            ))}
          </ul>
        )
      ) : reviews.length === 0 ? (
        <HudPanel className="py-10 text-center">
          <p className="text-sm text-muted-foreground">还没有复盘记录。</p>
        </HudPanel>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <HudPanel accent="purple" className="flex flex-col gap-2">
                <p className="text-sm font-medium leading-relaxed">{review.mistakeType}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {review.loss ? <span>损失:{review.loss}</span> : null}
                  {review.stateWhenError ? (
                    <span>状态:{STATE_LABELS[review.stateWhenError as StateWhenError] ?? review.stateWhenError}</span>
                  ) : null}
                  <span className="font-mono">{new Date(review.createdAt).toLocaleDateString("zh-CN")}</span>
                </div>
              </HudPanel>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RuleCard({ rule, index }: { rule: Rule; index: number }) {
  const [active, setActive] = useState(rule.isActive)
  const [deleted, setDeleted] = useState(false)

  async function handleToggle(checked: boolean) {
    setActive(checked)
    await setRuleActive(rule.id, checked)
  }

  async function handleDelete() {
    setDeleted(true)
    await deleteRule(rule.id)
  }

  if (deleted) return null

  const evidence = evidenceOf(rule)
  const matched = rule.matchCount ?? 0
  const acted = rule.actedCount ?? 0
  const effectiveness = matched > 0 ? Math.round((acted / matched) * 100) : 0

  return (
    <HudPanel accent={evidence.tone} className="relative pt-5">
      {/* 序号角标:让规则库像一份有编号的战术手册 */}
      <span
        className={cn(
          "hud-tile absolute left-0 top-0 flex size-7 items-center justify-center rounded-br-lg rounded-tl-xl font-mono text-xs font-bold",
          toneText(evidence.tone),
        )}
        aria-hidden="true"
      >
        {index}
      </span>

      <div className="flex items-start gap-3">
        <IconTile icon={FileText} tone={evidence.tone} className="size-12" />
        <Link
          href={`/rules/${rule.id}`}
          className="min-w-0 flex-1 font-serif text-base leading-relaxed transition-colors hover:text-primary"
        >
          {rule.ruleText}
        </Link>
        <Switch checked={active} onCheckedChange={handleToggle} aria-label="启用规则" />
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-border">
        <Facet icon={AlertTriangle} tone="red" label="风险信号" value={rule.scenario ?? "未标注"} />
        <Facet icon={Target} tone="gold" label="最小行动" value={rule.principleText ?? "待补充"} />
        <Facet icon={evidence.icon} tone={evidence.tone} label="证据" value={evidence.label} />
      </dl>

      <div className="mt-4 border-t border-border pt-3">
        <MeterBar label="有效性" value={effectiveness} tone={evidence.tone} valueLabel={`${effectiveness}%`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill tone="muted">{DOMAIN_LABELS[(rule.domain as Domain) ?? "custom"] ?? rule.domain}</StatusPill>
        <StatusPill tone="muted">v{rule.currentVersion ?? 1}</StatusPill>
        {rule.weaknessKey && rule.weaknessKey in WEAKNESS_LABELS ? (
          <StatusPill tone="purple">{WEAKNESS_LABELS[rule.weaknessKey as WeaknessKey]}</StatusPill>
        ) : null}
        {!active ? <StatusPill tone="muted">未启用</StatusPill> : null}
        {(rule.validatedCount ?? 0) < 3 ? (
          <span className="text-xs text-muted-foreground">样本不足 3 次,暂不自动调整规则。</span>
        ) : null}
        <button
          type="button"
          onClick={handleDelete}
          className="ml-auto min-h-9 px-2 text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          删除
        </button>
      </div>
    </HudPanel>
  )
}

function Facet({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Target
  tone: HudTone
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn("size-3.5 shrink-0", toneText(tone))} aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn("truncate text-sm font-medium", toneText(tone))} title={value}>
        {value}
      </dd>
    </div>
  )
}
