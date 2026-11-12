"use client";
import { reportActionError } from "@/components/action-feedback";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, RotateCcw, Trash2 } from "lucide-react";
import { moduleLinks, orderModuleLinks } from "@/components/app-nav";
import { saveNavOrder, resetNavOrder } from "@/app/actions/preferences";
import { cn } from "@/lib/utils";

const DRAFT_KEYS = ["event-quick-record-draft", "boundary-form-draft"];

export function SettingsPanel({
  initialOrder,
}: {
  initialOrder: string[] | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [draftsCleared, setDraftsCleared] = useState(false);

  const [order, setOrder] = useState(() =>
    orderModuleLinks(initialOrder).map((link) => link.href),
  );

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setSavedTick(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveNavOrder(order);
        if (!result.ok) {
          setError(result.error ?? "保存失败");
          return;
        }
        setSavedTick(true);
        router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      try {
        await resetNavOrder();
        setOrder(moduleLinks.map((link) => link.href));
        setSavedTick(true);
        router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  function handleClearDrafts() {
    try {
      for (const key of DRAFT_KEYS) localStorage.removeItem(key);
      setDraftsCleared(true);
    } catch {
      setError("清除草稿失败");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="nav-order-title"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2 id="nav-order-title" className="text-lg font-medium">
          侧栏导航排序
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          首页和换算固定在前两位。可调整下列侧栏模块的顺序。
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {order.map((href, index) => {
            const link = moduleLinks.find((l) => l.href === href);
            if (!link) return null;
            const Icon = link.icon;
            return (
              <li
                key={href}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <span className="flex items-center gap-3 text-base">
                  <Icon
                    className="size-5 stroke-[1.6] text-muted-foreground"
                    aria-hidden="true"
                  />
                  {link.label}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || isPending}
                    aria-label={`将“${link.label}”上移`}
                    className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-35"
                  >
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1 || isPending}
                    aria-label={`将“${link.label}”下移`}
                    className="flex size-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-muted disabled:opacity-35"
                  >
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {savedTick ? <Check className="size-4" aria-hidden="true" /> : null}
            {isPending ? "保存中…" : savedTick ? "已保存" : "保存排序"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            恢复默认
          </button>
        </div>
      </section>

      <section
        aria-labelledby="local-data-title"
        className="rounded-xl border border-border bg-card p-5"
      >
        <h2 id="local-data-title" className="text-lg font-medium">
          本地草稿
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          表单填写到一半会自动在本机保存草稿。如需清除,点击下方按钮(不影响已提交的数据)。
        </p>
        <button
          type="button"
          onClick={handleClearDrafts}
          className={cn(
            "mt-4 flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors",
            draftsCleared
              ? "text-muted-foreground"
              : "text-destructive hover:bg-destructive/5",
          )}
          disabled={draftsCleared}
        >
          {draftsCleared ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              已清除本地草稿
            </>
          ) : (
            <>
              <Trash2 className="size-4" aria-hidden="true" />
              清除本地草稿
            </>
          )}
        </button>
      </section>
    </div>
  );
}
