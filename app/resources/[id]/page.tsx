import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { getResourceDetail } from "@/app/actions/resources"
import {
  resourceTypeLabel,
  domainLabel,
  mainlineLabel,
  conversionLabel,
  evidenceTypeLabel,
  linkedTypeLabel,
  CONVERSION_LEVELS,
} from "@/lib/resource-types"
import {
  ResourceStatusPills,
  AddEvidenceForm,
  AddLinkForm,
} from "@/components/resource-detail-actions"

export const metadata = { title: "资源详情" }

function fmt(d: Date | null): string {
  if (!d) return "未记录"
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })
}

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()

  const detail = await getResourceDetail(numId)
  if (!detail) notFound()
  const { resource, evidence, links, reviews } = detail

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/resources"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回资源配置台
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold leading-snug tracking-tight text-pretty">{resource.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{resourceTypeLabel(resource.resourceType)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{domainLabel(resource.domain)}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            {conversionLabel(resource.conversionLevel)}
          </span>
        </div>
      </header>

      {/* 状态操作 */}
      <section aria-label="状态管理" className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">状态</h2>
        <ResourceStatusPills resourceId={resource.id} status={resource.status} />
      </section>

      {/* 激活三要素 */}
      <section className="shadow-card flex flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5">
        <h2 className="text-sm font-semibold">激活三要素</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">服务主线</dt>
            <dd>{resource.mainline ? mainlineLabel(resource.mainline) : "未设置"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">下一次使用动作</dt>
            <dd>{resource.nextAction ?? "未设置"}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">预期成果</dt>
            <dd>{resource.expectedOutput ?? "未设置"}</dd>
          </div>
        </dl>
      </section>

      {/* 转化层级说明 + 证据 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">成果证据({evidence.length})</h2>
          <span className="text-xs text-muted-foreground">
            {CONVERSION_LEVELS.find((l) => l.value === resource.conversionLevel)?.desc}
          </span>
        </div>
        {evidence.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
            尚无证据。转化层级只能靠成果证据推进,不能手动修改。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {evidence.map((ev) => (
              <li key={ev.id} className="shadow-card flex flex-col gap-1 rounded-xl border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {evidenceTypeLabel(ev.evidenceType)}
                  </span>
                  {ev.conversionLevel && (
                    <span className="text-xs font-medium">L{ev.conversionLevel}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(ev.createdAt)}</span>
                </div>
                {ev.title && <p className="text-sm font-medium">{ev.title}</p>}
                {ev.content && <p className="text-xs leading-relaxed text-muted-foreground">{ev.content}</p>}
              </li>
            ))}
          </ul>
        )}
        <AddEvidenceForm resourceId={resource.id} />
      </section>

      {/* 外部关联 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">外部关联({links.length})</h2>
        {links.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
            人工关联 Obsidian、Flomo、模型树等外部笔记,系统只做索引。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((lk) => (
              <li key={lk.id} className="shadow-card flex items-center gap-2 rounded-xl border bg-card px-4 py-3">
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {linkedTypeLabel(lk.linkedType)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{lk.externalTitle ?? "未命名"}</span>
                  {lk.keywords && <span className="truncate text-xs text-muted-foreground">{lk.keywords}</span>}
                </div>
                {lk.externalUrl && (
                  <a
                    href={lk.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="打开外部链接"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddLinkForm resourceId={resource.id} />
      </section>

      {/* 复盘记录 */}
      {reviews.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">复盘记录({reviews.length})</h2>
          <ul className="flex flex-col gap-2">
            {reviews.map((rv) => (
              <li key={rv.id} className="shadow-card flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm">
                <span className="text-xs text-muted-foreground">{fmt(rv.createdAt)}</span>
                {rv.actualUsage && <p>实际使用:{rv.actualUsage}</p>}
                {rv.outputCreated && <p>产生结果:{rv.outputCreated}</p>}
                {rv.unusedReason && <p>未使用原因:{rv.unusedReason}</p>}
                {rv.reflection && <p className="text-xs text-muted-foreground">{rv.reflection}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 元信息 */}
      <section className="flex flex-col gap-1 rounded-xl border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
        <p>登记时间:{fmt(resource.createdAt)} · 最近使用:{fmt(resource.lastUsedAt)} · 使用次数:{resource.usageCount}</p>
        {resource.purchaseCost !== null && (
          <p>
            购入成本:{resource.currency === "USD" ? "$" : "¥"}
            {resource.purchaseCost}
          </p>
        )}
        {resource.locationUrl && (
          <a href={resource.locationUrl} target="_blank" rel="noopener noreferrer" className="truncate underline underline-offset-2">
            {resource.locationUrl}
          </a>
        )}
        {resource.notes && <p>{resource.notes}</p>}
      </section>
    </div>
  )
}
