"use client";

import {
  useEffect,
  useRef,
  useState,
  type TransitionStartFunction,
} from "react";
import { useRouter } from "next/navigation";
import { updateTreeTask } from "@/app/actions/tree-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TreeTask } from "@/db/schema";
import { calendarDateTime } from "@/lib/calendar";

const PRIORITIES = ["P0", "P1", "P2"] as const;

export function TaskTimingEditor({
  id,
  task,
  timeZone,
  isPending,
  startTransition,
  onClose,
}: {
  id: string;
  task: Pick<TreeTask, "id" | "title" | "priority" | "deadline">;
  timeZone: string;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [initial] = useState(() => ({
    priority: task.priority,
    deadline: task.deadline?.toISOString() ?? null,
    deadlineLocal: task.deadline
      ? calendarDateTime(task.deadline, timeZone)
      : "",
  }));
  const [priority, setPriority] = useState(initial.priority);
  const [deadlineLocal, setDeadlineLocal] = useState(initial.deadlineLocal);
  const [error, setError] = useState<string | null>(null);
  const priorityInput = useRef<HTMLSelectElement>(null);
  const deadlineInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    priorityInput.current?.focus();
  }, []);

  const selectedPriority = PRIORITIES.find((value) => value === priority);
  const priorityChanged = priority !== initial.priority && !!selectedPriority;
  const deadlineChanged = deadlineLocal !== initial.deadlineLocal;

  return (
    <form
      id={id}
      aria-label={`任务设置：${task.title}`}
      aria-busy={isPending}
      className="mx-2 mt-1 mb-2 rounded-lg border border-border bg-background p-3 sm:ml-12"
      onSubmit={(event) => {
        event.preventDefault();
        if (isPending || (!priorityChanged && !deadlineChanged)) return;

        setError(null);
        startTransition(async () => {
          try {
            const result = await updateTreeTask({
              id: task.id,
              timing: {
                expected: {
                  priority: initial.priority,
                  deadline: initial.deadline,
                },
                ...(priorityChanged ? { priority: selectedPriority } : {}),
                ...(deadlineChanged
                  ? { deadlineLocal: deadlineLocal || null }
                  : {}),
              },
            });
            if (result.error) {
              setError(result.error);
              if ("staleTiming" in result && result.staleTiming)
                router.refresh();
              return;
            }
            onClose();
          } catch {
            setError("暂时无法保存任务设置，请重试。");
          }
        });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isPending) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p className="text-sm font-semibold">任务设置</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${id}-priority`}>优先级</Label>
          <select
            ref={priorityInput}
            id={`${id}-priority`}
            value={priority}
            disabled={isPending}
            onChange={(event) => setPriority(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-input bg-card px-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {!PRIORITIES.some((value) => value === initial.priority) && (
              <option value={initial.priority}>保留现有优先级</option>
            )}
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${id}-deadline`}>截止时间</Label>
          <Input
            ref={deadlineInput}
            id={`${id}-deadline`}
            type="datetime-local"
            value={deadlineLocal}
            disabled={isPending}
            aria-describedby={`${id}-timezone`}
            onChange={(event) => setDeadlineLocal(event.target.value)}
            className="h-10 min-w-0 bg-card"
          />
          <p id={`${id}-timezone`} className="text-xs text-muted-foreground">
            可选 · {timeZone}
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending || !deadlineLocal}
          onClick={() => {
            setDeadlineLocal("");
            deadlineInput.current?.focus();
          }}
          className="min-h-10 px-2 text-muted-foreground"
        >
          清除截止时间
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
            className="min-h-10"
          >
            取消
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isPending || (!priorityChanged && !deadlineChanged)}
            className="min-h-10"
          >
            保存任务设置
          </Button>
        </div>
      </div>
    </form>
  );
}
