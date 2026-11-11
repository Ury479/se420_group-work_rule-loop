"use client";
import { reportActionError } from "@/components/action-feedback";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Trash2 } from "lucide-react";
import {
  deleteSpendConversion,
  linkConversionRule,
} from "@/app/actions/spend-conversion";

// 规则关联与删除：已关联规则的历史结果由服务端保护。
export function ConversionDetailActions({
  conversionId,
  ruleId,
}: {
  conversionId: number;
  ruleId: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function link() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await linkConversionRule(conversionId);
        if (res && "error" in res && res.error) {
          setError(res.error);
          return;
        }
        router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteSpendConversion(conversionId);
        if (res && "error" in res && res.error) {
          setError(res.error);
          setConfirming(false);
          return;
        }
        router.push("/convert");
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ruleId ? (
          <a
            href={`/rules/${ruleId}`}
            className="flex min-h-11 items-center gap-1.5 rounded-md border px-3.5 text-sm transition-colors hover:bg-accent"
          >
            <Link2 className="size-4" aria-hidden="true" />
            查看关联规则 #{ruleId}
          </a>
        ) : (
          <button
            type="button"
            onClick={link}
            disabled={isPending}
            className="flex min-h-11 items-center gap-1.5 rounded-md border px-3.5 text-sm transition-colors hover:bg-accent"
          >
            <Link2 className="size-4" aria-hidden="true" />
            关联冲动消费规则
          </button>
        )}
        {confirming ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="min-h-11 rounded-md border border-destructive/50 px-3.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              确认删除
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-11 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              取消
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            删除这条换算
          </button>
        )}
      </div>
      {confirming ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          删除只影响这条换算记录,关联的事件、复盘和规则会保留。
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
