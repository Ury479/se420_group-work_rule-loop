"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportActionError } from "@/components/action-feedback";
import { useTranslator } from "@/components/page-translator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { calendarDateTime } from "@/lib/calendar";
import { FINAL_DECISIONS } from "@/lib/spending-review-types";
import {
  deleteSpendingReview,
  recheckAfterCooling,
  saveFinalDecision,
  startOrRetryHermesReview,
} from "@/app/actions/spending-review";

export function CoolingRecheck({
  reviewId,
  coolingUntil,
  ready,
}: {
  reviewId: number;
  coolingUntil: string | null;
  ready: boolean;
}) {
  const router = useRouter();
  const { lang } = useTranslator();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function recheck(stillNeeded: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await recheckAfterCooling(reviewId, stillNeeded, lang);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <section
      className="grid gap-2 rounded-xl border border-warning/30 bg-warning/8 p-4"
      aria-labelledby="cooling-title"
    >
      <h3 id="cooling-title" className="font-semibold text-warning">
        {ready ? "冷静期已结束" : "先完成冷静期"}
      </h3>
      {!ready && coolingUntil && (
        <p className="text-sm text-muted-foreground">
          <span>冷静期结束时间</span>{" "}
          <time dateTime={coolingUntil} data-no-translate>
            {calendarDateTime(new Date(coolingUntil)).replace("T", " ")}
          </time>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {ready
          ? "这笔支出现在仍有必要吗？"
          : "记录已保存。冷静期结束后，确认仍有需要即可启动 Hermes 审核。"}
      </p>
      {ready && (
        <div className="mt-1 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => recheck(true)}
            className="min-h-11"
          >
            仍有需要，开始审核
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => recheck(false)}
            className="min-h-11"
          >
            取消支出
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

export function StartHermesReviewButton({
  reviewId,
  retry = false,
}: {
  reviewId: number;
  retry?: boolean;
}) {
  const router = useRouter();
  const { lang } = useTranslator();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startReview() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startOrRetryHermesReview(reviewId, lang);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={startReview}
        className="min-h-11"
      >
        {isPending
          ? "正在提交审核"
          : retry
            ? "重试 Hermes 审核"
            : "发起 Hermes 审核"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FinalDecisionForm({
  reviewId,
  blockConfirmation,
}: {
  reviewId: number;
  blockConfirmation: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isPending || (decision === "confirm_pay" && blockConfirmation)) return;
    startTransition(async () => {
      try {
        const result = await saveFinalDecision({
          id: reviewId,
          finalDecision: decision as (typeof FINAL_DECISIONS)[number]["value"],
          finalDecisionReason: reason.trim() || null,
          paymentCompleted: decision === "confirm_pay" && paid,
        });
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={submit}>
      <fieldset className="min-w-0" disabled={isPending}>
        <legend className="text-sm font-semibold">你的决定</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FINAL_DECISIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm has-[:checked]:bg-muted has-[:checked]:shadow-[inset_0_-2px_var(--rl-ui-accent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring has-[:disabled]:cursor-default has-[:disabled]:opacity-65"
            >
              <input
                type="radio"
                name="decision"
                value={option.value}
                checked={decision === option.value}
                onChange={() => setDecision(option.value)}
                disabled={
                  option.value === "confirm_pay" && Boolean(blockConfirmation)
                }
                className="accent-primary"
                required
              />
              {option.value === "confirm_pay" ? "确认支出" : option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {blockConfirmation && (
        <p className="text-sm text-warning">{blockConfirmation}</p>
      )}
      {decision === "confirm_pay" && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="accent-primary"
          />
          已在外部完成付款
        </label>
      )}
      <div className="grid gap-2">
        <Label htmlFor="fd-reason">
          决定理由{" "}
          <span className="text-xs font-normal text-muted-foreground">
            选填
          </span>
        </Label>
        <Textarea
          id="fd-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          rows={2}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isPending}
        className="h-11 justify-self-end"
      >
        保存决定
      </Button>
    </form>
  );
}

// ── 删除 ──

export function DeleteReviewButton({ reviewId }: { reviewId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function remove() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        await deleteSpendingReview(reviewId);
        router.push("/spending-review");
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={remove}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive"
    >
      {confirming ? "再点一次确认删除" : "删除"}
    </Button>
  );
}
