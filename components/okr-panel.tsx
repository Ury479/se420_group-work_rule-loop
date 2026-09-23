"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  createObjective,
  createKeyResult,
  deleteObjective,
  type TaskTreeData,
} from "@/app/actions/tree-tasks"
import { Plus, Trash2, Target } from "lucide-react"

export function OkrPanel({
  objectives,
}: {
  objectives: TaskTreeData["objectives"]
}) {
  const [isPending, startTransition] = useTransition()
  const [newObjective, setNewObjective] = useState("")
  const [addingKrFor, setAddingKrFor] = useState<number | null>(null)
  const [krTitle, setKrTitle] = useState("")

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action()
    })
  }

  function submitObjective() {
    const t = newObjective.trim()
    if (!t) return
    setNewObjective("")
    run(() => createObjective(t))
  }

  function submitKr(objectiveId: number) {
    const t = krTitle.trim()
    if (!t) return
    setKrTitle("")
    setAddingKrFor(null)
    run(() => createKeyResult(objectiveId, t))
  }

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-4 px-4">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">目标与关键结果</h2>
        </div>

        {objectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            还没有目标。先写下一个 Objective,再为它添加关键结果(KR),然后把任务树的根任务绑定到 KR。
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {objectives.map((o) => (
              <li key={o.id} className="flex flex-col gap-2">
                <div className="group/obj flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {o.title}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {o.progress}%
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    className="hidden text-destructive group-hover/obj:flex"
                    onClick={() => run(() => deleteObjective(o.id))}
                    aria-label={`删除目标 ${o.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
                <Progress value={o.progress} aria-label={`${o.title} 进度`} />
                <ul className="flex flex-col gap-1.5 pl-3">
                  {o.keyResults.map((kr) => (
                    <li key={kr.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {kr.title}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {kr.progress}%
                      </span>
                    </li>
                  ))}
                  {addingKrFor === o.id ? (
                    <li className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={krTitle}
                        onChange={(e) => setKrTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.nativeEvent.isComposing &&
                            e.keyCode !== 229
                          ) {
                            submitKr(o.id)
                          }
                          if (e.key === "Escape") setAddingKrFor(null)
                        }}
                        placeholder="关键结果,例如:完成 Chapter 1"
                        className="h-8 text-sm"
                      />
                      <Button size="sm" onClick={() => submitKr(o.id)}>
                        添加
                      </Button>
                    </li>
                  ) : (
                    <li>
                      <button
                        type="button"
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setAddingKrFor(o.id)
                          setKrTitle("")
                        }}
                      >
                        <Plus className="size-3" aria-hidden="true" />
                        添加关键结果
                      </button>
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Input
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                submitObjective()
              }
            }}
            placeholder="新目标,例如:通过 Software Engineering Final"
            className="h-9"
          />
          <Button onClick={submitObjective} disabled={isPending}>
            <Plus className="size-4" aria-hidden="true" />
            添加
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
