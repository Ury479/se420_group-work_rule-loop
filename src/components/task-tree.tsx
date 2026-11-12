"use client";
import { reportActionError } from "@/components/action-feedback";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskTimingEditor } from "@/components/task-timing-editor";
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
} from "@/app/actions/tree-tasks";
import type { TreeTask } from "@/db/schema";
import { calendarDateTime } from "@/lib/calendar";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

type TaskNode = TreeTask & { children: TaskNode[] };

function buildForest(tasks: TreeTask[]): TaskNode[] {
  const map = new Map<number, TaskNode>();
  for (const t of tasks) map.set(t.id, { ...t, children: [] });
  const roots: TaskNode[] = [];
  for (const node of map.values()) {
    if (node.parentId != null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (list: TaskNode[]) => {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function getAncestorIds(tasks: TreeTask[], taskId: number | null) {
  const ancestors = new Set<number>();
  if (taskId === null) return ancestors;

  const byId = new Map(tasks.map((task) => [task.id, task]));
  let parentId = byId.get(taskId)?.parentId;
  while (parentId != null && parentId !== taskId && !ancestors.has(parentId)) {
    ancestors.add(parentId);
    parentId = byId.get(parentId)?.parentId;
  }
  return ancestors;
}

export function TaskTree({
  data,
  focusedTaskId,
  timeZone,
}: {
  data: TaskTreeData;
  focusedTaskId: number | null;
  timeZone: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [newRootTitle, setNewRootTitle] = useState("");
  const [addingChildOf, setAddingChildOf] = useState<number | null>(null);
  const [childTitle, setChildTitle] = useState("");
  const [editingTimingId, setEditingTimingId] = useState<number | null>(null);
  const [releasedAncestors, setReleasedAncestors] = useState(
    () => new Set<number>(),
  );
  const focusedRow = useRef<HTMLDivElement>(null);
  const timingOpener = useRef<HTMLButtonElement | null>(null);
  const restoreTimingFocus = useRef(false);

  const forest = buildForest(data.tasks);
  const focusedAncestors = getAncestorIds(data.tasks, focusedTaskId);
  const krOptions = data.objectives.flatMap((o) =>
    o.keyResults.map((kr) => ({
      id: kr.id,
      label: `${o.title} · ${kr.title}`,
    })),
  );

  useEffect(() => {
    if (focusedTaskId === null) return;
    const row = focusedRow.current;
    if (!row) return;
    const checkbox = row.querySelector<HTMLElement>(
      '[role="checkbox"]:not([aria-disabled="true"]):not(:disabled)',
    );
    row.scrollIntoView({ block: "center", behavior: "instant" });
    (checkbox ?? row).focus({ preventScroll: true });
  }, [focusedTaskId]);

  useEffect(() => {
    if (editingTimingId !== null || isPending || !restoreTimingFocus.current)
      return;
    restoreTimingFocus.current = false;
    timingOpener.current?.focus();
  }, [editingTimingId, isPending]);

  function closeTimingEditor() {
    restoreTimingFocus.current = true;
    setEditingTimingId(null);
  }

  function run(action: () => Promise<unknown>, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          reportActionError();
          return;
        }
        onSuccess?.();
      } catch {
        reportActionError();
      }
    });
  }

  function submitRoot() {
    const t = newRootTitle.trim();
    if (!t) return;
    run(
      () => createTreeTask({ title: t }),
      () => setNewRootTitle(""),
    );
  }

  function submitChild(parentId: number) {
    const t = childTitle.trim();
    if (!t) return;
    run(
      () => createTreeTask({ title: t, parentId }),
      () => {
        setChildTitle("");
        setAddingChildOf(null);
      },
    );
  }

  function renderNode(node: TaskNode, isRoot: boolean) {
    const hasChildren = node.children.length > 0;
    const isFocused = node.id === focusedTaskId;
    const isEditingTiming = node.id === editingTimingId;
    const timingFormId = `task-timing-${node.id}`;
    const revealAncestor =
      focusedAncestors.has(node.id) && !releasedAncestors.has(node.id);
    const isExpanded = !node.collapsed || revealAncestor;
    const indent = `${node.level * 20 + 8}px`;
    return (
      <li
        key={node.id}
        className="flex flex-col"
        aria-current={isFocused ? "true" : undefined}
      >
        <div
          id={`task-${node.id}`}
          ref={isFocused ? focusedRow : undefined}
          tabIndex={isFocused ? -1 : undefined}
          className={cn(
            "group/row flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/60 sm:flex-nowrap",
            isFocused && "bg-primary/10 ring-2 ring-inset ring-primary",
          )}
          style={{ paddingLeft: isFocused ? `min(${indent}, 20vw)` : indent }}
        >
          {hasChildren ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (revealAncestor) {
                  setReleasedAncestors((ids) => new Set(ids).add(node.id));
                  // A temporarily opened group is still collapsed in storage.
                  if (node.collapsed) return;
                }
                run(() => toggleTaskCollapsed(node.id));
              }}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary"
              aria-label={isExpanded ? "折叠" : "展开"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="size-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-4" aria-hidden="true" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" aria-hidden="true" />
          )}

          <Checkbox
            checked={
              hasChildren ? node.progress === 100 : node.status === "done"
            }
            disabled={hasChildren || isPending}
            onCheckedChange={() => run(() => toggleTaskStatus(node.id))}
            aria-label={`完成 ${node.title}`}
          />

          <div className="min-w-0 flex-[1_0_7rem] sm:flex-1">
            <span
              className={cn(
                "block text-sm",
                isFocused ? "wrap-anywhere" : "truncate",
                (hasChildren ? node.progress === 100 : node.status === "done")
                  ? "text-muted-foreground line-through"
                  : "",
              )}
            >
              {node.title}
            </span>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="font-mono text-primary">{node.priority}</span>
              {node.deadline && (
                <span>
                  <span>截止</span>{" "}
                  <time
                    dateTime={node.deadline.toISOString()}
                    className="tabular-nums"
                  >
                    {calendarDateTime(node.deadline, timeZone).replace(
                      "T",
                      " ",
                    )}
                  </time>
                </span>
              )}
            </div>
          </div>

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

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            aria-label={`任务设置：${node.title}`}
            aria-expanded={isEditingTiming}
            aria-controls={isEditingTiming ? timingFormId : undefined}
            className="h-9 shrink-0 px-2 text-xs sm:px-3"
            onClick={(event) => {
              if (isEditingTiming) {
                closeTimingEditor();
                return;
              }
              timingOpener.current = event.currentTarget;
              setEditingTimingId(node.id);
            }}
          >
            任务设置
          </Button>

          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-0.5 lg:hidden lg:group-hover/row:flex lg:group-focus-within/row:flex",
              isFocused && "basis-full justify-end sm:basis-auto",
            )}
          >
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setAddingChildOf(node.id);
                setChildTitle("");
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

        {isEditingTiming && (
          <TaskTimingEditor
            id={timingFormId}
            task={node}
            timeZone={timeZone}
            isPending={isPending}
            startTransition={startTransition}
            onClose={closeTimingEditor}
          />
        )}

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
                  submitChild(node.id);
                }
                if (e.key === "Escape") setAddingChildOf(null);
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

        {hasChildren && isExpanded && (
          <ul className="flex flex-col">
            {node.children.map((c) => renderNode(c, false))}
          </ul>
        )}

        {isRoot && (
          <RootMeta
            node={node}
            krOptions={krOptions}
            isPending={isPending}
            run={run}
          />
        )}
      </li>
    );
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
                submitRoot();
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
  );
}

/** 根任务的 OKR 绑定与进度模式(轻量行,仅根任务显示) */
function RootMeta({
  node,
  krOptions,
  isPending,
  run,
}: {
  node: TaskNode;
  krOptions: { id: number; label: string }[];
  isPending: boolean;
  run: (a: () => Promise<unknown>) => void;
}) {
  const linked = krOptions.find((k) => k.id === node.keyResultId);
  if (krOptions.length === 0) return null;
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
          className="h-6 rounded border border-input bg-background px-1 text-xs"
          disabled={isPending}
          defaultValue=""
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v) run(() => updateTreeTask({ id: node.id, keyResultId: v }));
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
              }),
            )
          }
        >
          {node.progressMode === "weighted" ? "加权" : "平均"}
        </button>
      </span>
    </div>
  );
}
