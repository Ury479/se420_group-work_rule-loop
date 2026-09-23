import Link from "next/link"
import { ArrowLeft, Plus, Users } from "lucide-react"
import { getPeople } from "@/app/actions/people-resources"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  relationshipTypeLabel,
  relationshipStageLabel,
  interactionStatusLabel,
} from "@/lib/resource-types"

export const metadata = { title: "人脉资源" }

function statusTone(status: string): string {
  switch (status) {
    case "normal":
      return "bg-accent text-accent-foreground"
    case "owe_feedback":
    case "recent_asks":
    case "boundary_reset":
      return "bg-warning/15 text-warning-foreground"
    case "do_not_disturb":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default async function PeoplePage() {
  const people = await getPeople()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/resources"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回资源配置台
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">人脉资源</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            人脉是需要维护的关系,不是即取即用的工具。联系前先完成沟通计划。
          </p>
        </div>
        <Link href="/resources/people/new" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
          <Plus className="size-4" aria-hidden="true" />
          登记
        </Link>
      </header>

      {people.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">还没有登记人脉资源。</p>
          <Link href="/resources/people/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            登记第一位联系人
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/resources/people/${p.id}`}
                className="group/person shadow-card flex flex-col gap-2 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium group-hover/person:underline">{p.personName}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", statusTone(p.interactionStatus))}>
                    {interactionStatusLabel(p.interactionStatus)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5">{relationshipTypeLabel(p.relationshipType)}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{relationshipStageLabel(p.relationshipStage)}</span>
                  {p.lastContactAt && (
                    <span>
                      上次联系:
                      {new Date(p.lastContactAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
