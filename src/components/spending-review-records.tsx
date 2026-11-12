"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
} from "lucide-react";
import { DecisionStatusBadge, RiskBadge } from "@/components/spending-badges";
import { isClosedSpendingDecision } from "@/lib/spending-review-types";
import { cn } from "@/lib/utils";

export type SpendingRecordSummary = {
  id: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  riskLevel: string | null;
};

const links = [
  ["/spending-review/baseline", "最佳状态决策协议"],
  ["/spending-review/recovery", "主线回归"],
  ["/spending-review/anchors", "消费参照物"],
  ["/convert", "消费价值换算"],
] as const;

const steps = ["检查冷静期", "Hermes 审核", "人工决定"];
const stepByStatus: Record<string, number> = {
  cooling: 0,
  cooling_ready: 0,
  awaiting_gpt: 1,
  ai_queued: 1,
  ai_running: 1,
  ai_failed: 1,
  awaiting_final: 2,
};

export function SpendingReviewRecords({
  records,
  selectedId,
  nextCoolingAt,
}: {
  records: SpendingRecordSummary[];
  selectedId?: number;
  nextCoolingAt: number | null;
}) {
  const router = useRouter();
  const selected = records.find((record) => record.id === selectedId);
  const showArchived = selected
    ? isClosedSpendingDecision(selected.status)
    : false;
  const selectionKey = `${selectedId ?? "new"}:${showArchived}`;
  const [selection, setSelection] = useState({
    key: selectionKey,
    archived: showArchived,
  });
  const archived =
    selection.key === selectionKey ? selection.archived : showArchived;
  const openCount = records.filter(
    (record) => !isClosedSpendingDecision(record.status),
  ).length;
  const activeStep = selected ? stepByStatus[selected.status] : undefined;
  const processing = records.some((record) =>
    ["ai_queued", "ai_running"].includes(record.status),
  );

  useEffect(() => {
    if (!processing && nextCoolingAt === null) return;
    function refreshVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const poll = processing
      ? window.setInterval(refreshVisible, 5000)
      : undefined;
    const cooling =
      nextCoolingAt === null
        ? undefined
        : window.setTimeout(
            refreshVisible,
            Math.min(
              2_147_483_647,
              Math.max(0, nextCoolingAt - Date.now() + 250),
            ),
          );
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(cooling);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [router, processing, nextCoolingAt]);

  return (
    <aside
      aria-labelledby="spending-records-title"
      className="min-w-0 rounded-2xl border bg-card shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 xl:px-5">
        <h2
          id="spending-records-title"
          tabIndex={-1}
          className="scroll-mt-5 text-lg font-semibold"
        >
          审核记录
        </h2>
        <div
          role="group"
          aria-label="筛选审核记录"
          className="flex gap-1 rounded-lg bg-muted p-1"
        >
          {([false, true] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={archived === value}
              onClick={() =>
                setSelection({ key: selectionKey, archived: value })
              }
              className="min-h-9 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-[inset_0_-2px_var(--accent)]"
            >
              {value ? "已归档" : "待处理"}
              {!value && <span className="ml-1 tabular-nums">{openCount}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 pb-2">
        {records
          .filter(
            (record) => isClosedSpendingDecision(record.status) === archived,
          )
          .map((record) => {
            const stage = stepByStatus[record.status];
            const Icon =
              record.status === "ai_failed"
                ? CircleAlert
                : stage === 0
                  ? Clock
                  : stage === 1
                    ? Bot
                    : stage === 2 || archived
                      ? CircleCheck
                      : FileText;
            return (
              <Link
                key={record.id}
                href={`/spending-review/${record.id}`}
                aria-current={selectedId === record.id ? "page" : undefined}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-t px-2 py-3 text-sm hover:bg-muted/55 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring aria-[current=page]:bg-muted"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground",
                    {
                      "bg-warning/10 text-warning": stage === 0,
                      "bg-destructive/10 text-destructive":
                        record.status === "ai_failed",
                      "bg-success/10 text-success": stage === 2,
                    },
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span
                    data-no-translate
                    className="block truncate font-semibold"
                  >
                    {record.title}
                  </span>
                  <span
                    data-no-translate
                    className="text-xs tabular-nums text-muted-foreground"
                  >
                    {record.currency} {record.amount}
                  </span>
                  {record.riskLevel === "high" ||
                  record.riskLevel === "critical" ? (
                    <RiskBadge level={record.riskLevel} className="ml-1" />
                  ) : null}
                </span>
                <DecisionStatusBadge
                  status={record.status}
                  className="whitespace-nowrap rounded-md"
                />
                <ChevronRight
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        {(archived ? records.length === openCount : openCount === 0) && (
          <p className="border-t px-2 py-4 text-sm text-muted-foreground">
            {archived ? "还没有归档的决定。" : "当前没有待处理的审核。"}
          </p>
        )}
      </div>
      <section
        aria-labelledby="spending-flow-title"
        className="rounded-b-2xl border-t bg-muted/40 p-4 xl:px-5"
      >
        <h3 id="spending-flow-title" className="text-sm font-semibold">
          审核流程
        </h3>
        <ol className="mt-2 grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === activeStep ? "step" : undefined}
              className="border-t-2 pt-1.5 aria-[current=step]:border-brand-accent aria-[current=step]:text-foreground"
            >
              {label}
            </li>
          ))}
        </ol>
      </section>
      <nav
        aria-label="决策辅助工具"
        className="flex flex-wrap gap-x-3 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground xl:px-5"
      >
        {links.map(([url, label]) => (
          <Link
            key={url}
            href={url}
            className="py-1 underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
