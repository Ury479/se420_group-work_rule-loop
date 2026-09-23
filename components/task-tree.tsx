"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  createTreeTask,
  toggleTaskStatus,
  toggleTaskCollapsed,
  deleteTreeTask,
  moveTask,
  indentTask,
  outdentTask,
  updateTreeTask,
  type TaskTreeData,
} from "@/app/actions/tree-tasks"
import type { TreeTask } from "@/lib/db/schema"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  ArrowUp,
  ArrowDown,
  IndentIncrease,
  IndentDecrease,
  Trash2,
  Target,
} from "lucide-react"

type TaskNode = TreeTask & { children: TaskNode[] }

function buildForest(tasks: TreeTask[]): TaskNode[] {
  const map = new Map<number, TaskNode>()
  for (const t of tasks) map.set(t.id, { ...t, children: [] })
  const roots: TaskNode[] = []
  for (const node of map.values()) {
    if (node.parentId != null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortRec = (list: TaskNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    list.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

export function TaskTree({ data }: { data: TaskTreeData }) {
  const [isPending, startTransition] = useTransition()
  const [newRootTitle, setNewRootTitle] = useState("")
  const [addingChildOf, setAddingChildOf] = useState<number | null>(null)
  const [childTitle, setChildTitle] = useState("")

  const forest = buildForest(data.tasks)
  const krOptions = data.objectives.flatMap((o) =>
    o.keyResults.map((kr) => ({ id: kr.id, label: `${o.title} · ${kr.title}` }))
  )

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action()
    })
  }

  function submitRoot() {
    const t = newRootTitle.trim()
    if (!t) return
    setNewRootTitle("")
    run(() => createTreeTask({ title: t }))
  }

  function submitChild(parentId: number) {
    const t = childTitle.trim()
    if (!t) return
    setChildTitle("")
    setAddingChildOf(null)
    run(() => createTreeTask({ title: t, parentId }))
  }

  function renderNode(node: TaskNode, isRoot: boolean) {
    const hasChildren = node.children.length > 0
    return (
      <li key={node.id} className="flex flex-col">
        <div
          className="group/row flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/60"
          style={{ paddingLeft: `${node.level * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => run(() => toggleTaskCollapsed(node.id))}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
              aria-label={node.collapsed ? "展开" : "折叠"}
            >
              {node.collapsed ? (
                <ChevronRight className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" aria-hidden="true" />
          )}

          <Checkbox
            checked={hasChildren ? node.progress === 100 : node.status === "done"}
            disabled={hasChildren || isPending}
            onCheckedChange={() => run(() => toggleTaskStatus(node.id))}
            aria-label={`完成 ${node.title}`}
          />

          <span
            className={`min-w-0 flex-1 truncate text-sm ${
              (hasChildren ? node.progress === 100 : node.status === "done")
                ? "text-muted-foreground line-through"
                : ""
            }`}
          >
            {node.title}
          </span>

          {node.weight > 1 && (
            <Badge variant="outline" className="shrink-0 text-xs">
              权重 {node.weight}
            </Badge>
          )}

          {hasChildren && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {node.progress}%
            </span>
          )}

          <div className="hidden shrink-0 items-center gap-0.5 group-hover/row:flex">
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setAddingChildOf(node.id)
                setChildTitle("")
              }}
              aria-label="添加子任务"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => run(() => moveTask(node.id, "up"))}
              aria-label="上移"
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => run(() => moveTask(node.id, "down"))}
              aria-label="下移"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => run(() => indentTask(node.id))}
              aria-label="降级为子任务"
            >
              <IndentIncrease className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending || node.parentId == null}
              onClick={() => run(() => outdentTask(node.id))}
              aria-label="提升层级"
            >
              <IndentDecrease className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => run(() => deleteTreeTask(node.id))}
              className="text-destructive"
              aria-label="删除"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {addingChildOf === node.id && (
          <div
            className="flex items-center gap-2 py-1.5"
            style={{ paddingLeft: `${(node.level + 1) * 20 + 8}px` }}
          >
            <Input
              autoFocus
              value={childTitle}
              onChange={(e) => setChildTitle(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  submitChild(node.id)
                }
                if (e.key === "Escape") setAddingChildOf(null)
              }}
              placeholder="子任务名称,回车确认"
              className="h-8 max-w-sm text-sm"
            />
            <Button size="sm" onClick={() => submitChild(node.id)}>
              添加
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAddingChildOf(null)}
            >
              取消
            </Button>
          </div>
        )}

        {hasChildren && !node.collapsed && (
          <ul className="flex flex-col">
            {node.children.map((c) => renderNode(c, false))}
          </ul>
        )}

        {isRoot && (
          <RootMeta node={node} krOptions={krOptions} isPending={isPending} run={run} />
        )}
      </li>
    )
  }

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        {forest.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            还没有任务。写下一个目标级任务,然后逐层拆解。
          </p>
        ) : (
          <ul className="flex flex-col">
            {forest.map((n) => renderNode(n, true))}
          </ul>
        )}

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Input
            value={newRootTitle}
            onChange={(e) => setNewRootTitle(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                submitRoot()
              }
            }}
            placeholder="新增顶级任务,例如:完成毕业论文"
            className="h-9"
          />
          <Button onClick={submitRoot} disabled={isPending}>
            <Plus className="size-4" aria-hidden="true" />
            添加
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/** 根任务的 OKR 绑定与进度模式(轻量行,仅根任务显示) */
function RootMeta({
  node,
  krOptions,
  isPending,
  run,
}: {
  node: TaskNode
  krOptions: { id: number; label: string }[]
  isPending: boolean
  run: (a: () => Promise<unknown>) => void
}) {
  const linked = krOptions.find((k) => k.id === node.keyResultId)
  if (krOptions.length === 0) return null
  return (
    <div
      className="flex flex-wrap items-center gap-2 pb-2 text-xs text-muted-foreground"
      style={{ paddingLeft: `${node.level * 20 + 36}px` }}
    >
      <Target className="size-3" aria-hidden="true" />
      {linked ? (
        <>
          <span className="truncate">{linked.label}</span>
          <button
            type="button"
            disabled={isPending}
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() =>
              run(() => updateTreeTask({ id: node.id, keyResultId: null }))
            }
          >
            解绑
          </button>
        </>
      ) : (
        <select
          className="h-6 rounded border border-border bg-background px-1 text-xs"
          disabled={isPending}
          defaultValue=""
          onChange={(e) => {
            const v = Number(e.target.value)
            if (v) run(() => updateTreeTask({ id: node.id, keyResultId: v }))
          }}
          aria-label="绑定关键结果"
        >
          <option value="">绑定到 KR…</option>
          {krOptions.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      )}
      <span className="ml-auto flex items-center gap-1">
        进度模式
        <button
          type="button"
          disabled={isPending}
          className="rounded border border-border px-1.5 py-0.5 hover:bg-secondary"
          onClick={() =>
            run(() =>
              updateTreeTask({
                id: node.id,
                progressMode:
                  node.progressMode === "weighted" ? "average" : "weighted",
              })
            )
          }
        >
          {node.progressMode === "weighted" ? "加权" : "平均"}
        </button>
      </span>
    </div>
  )
}
