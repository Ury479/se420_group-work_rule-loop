"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  createDemand,
  escalateDemand,
  completeDemand,
} from "@/app/actions/weakness"
import { P0_LOCK_MESSAGE } from "@/lib/weakness"
import type { Demand } from "@/lib/db/schema"
import { Plus, Check, ArrowUp, Lock } from "lucide-react"

interface Lock {
  locked: boolean
  todayNewDemandCount: number
  todayCompletedKeyFactorCount: number
  hasUnfinishedP0: boolean
}

interface Props {
  active: Demand[]
  backlog: Demand[]
  done: Demand[]
  lock: Lock
}

const priorityClass: Record<string, string> = {
  P0: "bg-destructive text-destructive-foreground",
  P1: "bg-accent text-accent-foreground",
  P2: "bg-secondary text-secondary-foreground",
}

export function DemandBoard({ active, backlog, done, lock }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<"P0" | "P1" | "P2">("P2")
  const [isKeyFactor, setIsKeyFactor] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [escalatingId, setEscalatingId] = useState<number | null>(null)
  const [escalateReason, setEscalateReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleCreate() {
    if (!title.trim()) {
      setError("请填写需求内容")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createDemand({ title: title.trim(), priority, isKeyFactor })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      if ("lockedToBacklog" in result && result.lockedToBacklog) {
        setNotice(result.lockMessage ?? P0_LOCK_MESSAGE)
      } else {
        setNotice(null)
      }
      setTitle("")
      setIsKeyFactor(false)
      router.refresh()
    })
  }

  function handleEscalate(demandId: number) {
    if (!escalateReason.trim()) {
      setError("请回答:为什么这个需求必须现在做?")
      return
    }
    setError(null)
    startTransition(async () => {
      await escalateDemand({ demandId, escalateReason: escalateReason.trim() })
      setEscalatingId(null)
      setEscalateReason("")
      router.refresh()
    })
  }

  function handleComplete(demandId: number) {
    startTransition(async () => {
      await completeDemand(demandId)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* P0 锁定状态条 */}
      {lock.locked && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
          <Lock className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-pretty">
            P0 锁定中:{lock.hasUnfinishedP0 ? "存在未完成的 P0。" : ""}
            今日新增 {lock.todayNewDemandCount} 条需求,完成关键因{" "}
            {lock.todayCompletedKeyFactorCount} 个。新需求将默认进入 Backlog。
          </p>
        </div>
      )}

      {/* 新建需求 */}
      <Card className="py-5">
        <CardContent className="flex flex-col gap-3 px-5">
          <Label htmlFor="demand-title">新增需求</Label>
          <Input
            id="demand-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例:给筛查台加导出功能"
            maxLength={300}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                handleCreate()
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(["P0", "P1", "P2"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={priority === p ? "default" : "outline"}
                className={priority === p ? "" : "bg-transparent"}
                onClick={() => setPriority(p)}
              >
                {p}
              </Button>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={isKeyFactor}
                onChange={(e) => setIsKeyFactor(e.target.checked)}
                className="size-4 accent-primary"
              />
              关键因
            </label>
            <Button size="sm" disabled={isPending} onClick={handleCreate} className="ml-auto">
              <Plus className="size-4" aria-hidden="true" />
              添加
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && (
            <p
              role="status"
              className="rounded-md bg-secondary px-3 py-2 text-sm leading-relaxed text-secondary-foreground text-pretty"
            >
              {notice}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 进行中 */}
      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          进行中 · {active.length}
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">当前没有进行中的需求。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass[d.priority]}`}>
                  {d.priority}
                </span>
                <span className="flex-1 text-sm">{d.title}</span>
                {d.isKeyFactor && <Badge variant="outline">关键因</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleComplete(d.id)}
                >
                  <Check className="size-4" aria-hidden="true" />
                  完成
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Backlog */}
      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Backlog · {backlog.length}
        </h2>
        {backlog.length === 0 ? (
          <p className="text-sm text-muted-foreground">Backlog 是空的。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {backlog.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-card/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${priorityClass[d.priority]}`}>
                    {d.priority}
                  </span>
                  <span className="flex-1 text-sm text-muted-foreground">{d.title}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent"
                    disabled={isPending}
                    onClick={() =>
                      setEscalatingId(escalatingId === d.id ? null : d.id)
                    }
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                    升级
                  </Button>
                </div>
                {escalatingId === d.id && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`escalate-${d.id}`}>
                      为什么这个需求必须现在做?*
                    </Label>
                    <Textarea
                      id={`escalate-${d.id}`}
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="必须填写理由才能升级"
                      rows={2}
                      maxLength={500}
                    />
                    <Button
                      size="sm"
                      className="self-start"
                      disabled={isPending}
                      onClick={() => handleEscalate(d.id)}
                    >
                      确认升级为进行中
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 最近完成 */}
      {done.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            最近完成 · {done.length}
          </h2>
          <ul className="flex flex-col gap-2">
            {done.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 opacity-60"
              >
                <Check className="size-4 text-primary" aria-hidden="true" />
                <span className="flex-1 text-sm line-through">{d.title}</span>
                {d.isKeyFactor && <Badge variant="outline">关键因</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
