import Link from "next/link"
import { getResources } from "@/app/actions/resources"
import { getPeople } from "@/app/actions/people-resources"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  resourceTypeLabel,
  domainLabel,
  resourceStatusLabel,
  conversionLabel,
  interactionStatusLabel,
  DOMAIN_ACTIVE_LIMIT,
} from "@/lib/resource-types"
import { Plus, Users, Boxes } from "lucide-react"

export const metadata = { title: "资源配置台" }

function statusTone(status: string): string {
  switch (status) {
    case "active":
      return "bg-accent text-accent-foreground"
    case "trial":
    case "pending_review":
      return "bg-warning/15 text-warning-foreground"
    case "frozen":
    case "archived":
      return "bg-muted text-muted-foreground"
    case "removal_pending":
    case "removed":
    case "exhausted":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default async function ResourcesPage() {
  const [allResources, people] = await Promise.all([getResources(), getPeople()])

  const active = allResources.filter((r) => r.status === "active")
  const pendingReview = allResources.filter((r) => r.status === "pending_review" || r.status === "trial")
  const others = allResources.filter(
    (r) => !["active", "pending_review", "trial"].includes(r.status)
  )

  // 领域激活统计(规则 1 可视化)
  const domainCounts = new Map<string, number>()
  for (const r of active) {
    if (r.resourceType === "content" || r.resourceType === "tool") {
      domainCounts.set(r.domain, (domainCounts.get(r.domain) ?? 0) + 1)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">资源配置台</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            资源不是越多越好。激活需要主线、动作与预期成果;成果证据推动转化层级。
          </p>
        </div>
        <Link href="/resources/new" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
          <Plus className="size-4" aria-hidden="true" />
          登记资源
        </Link>
      </header>

      {/* 概览统计 */}
      <section aria-label="概览" className="grid grid-cols-3 gap-2">
        <div className="shadow-card flex flex-col gap-0.5 rounded-xl border bg-card px-3 py-2.5">
          <span className="text-lg font-semibold">{active.length}</span>
          <span className="text-xs text-muted-foreground">激活中</span>
        </div>
        <div className="shadow-card flex flex-col gap-0.5 rounded-xl border bg-card px-3 py-2.5">
          <span className="text-lg font-semibold">{pendingReview.length}</span>
          <span className="text-xs text-muted-foreground">待验证/待复审</span>
        </div>
        <div className="shadow-card flex flex-col gap-0.5 rounded-xl border bg-card px-3 py-2.5">
          <span className="text-lg font-semibold">{people.length}</span>
          <span className="text-xs text-muted-foreground">人脉资源</span>
        </div>
      </section>

      {/* 领域激活上限提示 */}
      {[...domainCounts.entries()].some(([, n]) => n >= DOMAIN_ACTIVE_LIMIT) && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {[...domainCounts.entries()]
            .filter(([, n]) => n >= DOMAIN_ACTIVE_LIMIT)
            .map(([d, n]) => (
              <p key={d}>
                「{domainLabel(d)}」已有 {n} 项激活资源(上限 {DOMAIN_ACTIVE_LIMIT})。新增前请先完成、冻结或退出一项。
              </p>
            ))}
        </div>
      )}

      {/* 人脉入口 */}
      <Link
        href="/resources/people"
        className="shadow-card flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25"
      >
        <Users className="size-5 text-muted-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">人脉资源与沟通计划</span>
          <span className="truncate text-xs text-muted-foreground">
            {people.length > 0
              ? `${people.length} 位联系人 · ${people
                  .slice(0, 3)
                  .map((p) => p.personName)
                  .join("、")}`
              : "尚未登记人脉资源"}
          </span>
        </div>
        {people.some((p) => p.interactionStatus === "owe_feedback") && (
          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
            {interactionStatusLabel("owe_feedback")}
          </span>
        )}
      </Link>

      {/* 资源列表 */}
      {allResources.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <Boxes className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">还没有登记任何资源。先从一门课程、一个工具开始。</p>
          <Link href="/resources/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            登记第一项资源
          </Link>
        </div>
      ) : (
        <>
          {[
            { title: "激活中", list: active },
            { title: "待验证 / 待复审", list: pendingReview },
            { title: "冻结 / 归档 / 其他", list: others },
          ]
            .filter((g) => g.list.length > 0)
            .map((group) => (
              <section key={group.title} className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold tracking-tight">{group.title}</h2>
                {group.list.map((r) => (
                  <Link
                    key={r.id}
                    href={`/resources/${r.id}`}
                    className="group/res shadow-card flex flex-col gap-2 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25"
                  >
                    <p className="line-clamp-2 text-sm font-medium leading-snug group-hover/res:underline">
                      {r.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusTone(r.status))}>
                        {resourceStatusLabel(r.status)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {resourceTypeLabel(r.resourceType)}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {domainLabel(r.domain)}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        {conversionLabel(r.conversionLevel)}
                      </span>
                    </div>
                    {r.nextAction && (
                      <p className="truncate text-xs text-muted-foreground">下一步:{r.nextAction}</p>
                    )}
                  </Link>
                ))}
              </section>
            ))}
        </>
      )}
    </div>
  )
}
