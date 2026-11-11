import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, FilePenLine, Plus, ReceiptText } from "lucide-react";
import {
  getSpendingReview,
  getSpendingReviewList,
} from "@/app/actions/spending-review";
import { getActiveAnchors } from "@/app/actions/spending-anchors";
import { SpendingReviewDetail } from "@/components/spending-review-detail";
import { SpendingReviewForm } from "@/components/spending-review-form";
import { SpendingReviewRecords } from "@/components/spending-review-records";
import { buttonVariants } from "@/components/ui/button";
import { withAccount } from "@/lib/action";
import {
  spendingReviewStage,
  type SpendingReviewJobStatus,
} from "@/lib/spending-review-job";

function displayStatus(
  status: string,
  job: SpendingReviewJobStatus | null | undefined,
  coolingUntil: Date | null,
  now: Date,
) {
  if (status === "cooling" && (!coolingUntil || coolingUntil <= now))
    return "cooling_ready";
  return spendingReviewStage(status, job);
}

export async function SpendingReviewWorkspace({
  selectedId,
}: {
  selectedId?: number;
}) {
  const { list, detail, anchors } = await withAccount(async () => ({
    list: await getSpendingReviewList(),
    detail:
      selectedId === undefined ? null : await getSpendingReview(selectedId),
    anchors: selectedId === undefined ? await getActiveAnchors() : [],
  }));
  if (selectedId !== undefined && !detail) notFound();

  const now = new Date();
  const selectedStatus = detail
    ? displayStatus(
        detail.review.decisionStatus,
        detail.aiReview?.status,
        detail.review.coolingUntil,
        now,
      )
    : undefined;
  const nextCoolingAt = list.reduce<number | null>((soonest, row) => {
    const until = row.coolingUntil?.getTime();
    if (row.decisionStatus !== "cooling" || !until || until <= now.getTime())
      return soonest;
    return soonest === null ? until : Math.min(soonest, until);
  }, null);
  const records = list.map((row) => {
    const status =
      (row.id === selectedId ? selectedStatus : undefined) ??
      displayStatus(row.decisionStatus, row.jobStatus, row.coolingUntil, now);
    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      currency: row.currency,
      riskLevel: row.riskLevel,
      status,
    };
  });

  return (
    <main className="grid gap-5 lg:gap-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          决策拦截台
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          提交支出计划，查看 Hermes 的建议，再由你决定。
        </p>
        <a
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          href="#spending-records-title"
        >
          查看审核记录 <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-5">
        <section
          aria-labelledby="spending-work-title"
          className="min-w-0 rounded-2xl border bg-card shadow-card"
        >
          <div className="flex items-center gap-3 border-b p-4 sm:px-6 sm:py-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              {detail ? (
                <ReceiptText className="size-4" aria-hidden="true" />
              ) : (
                <FilePenLine className="size-4" aria-hidden="true" />
              )}
            </span>
            <h2
              id="spending-work-title"
              className="min-w-0 flex-1 text-lg font-semibold wrap-anywhere sm:text-xl"
            >
              {detail ? (
                <span data-no-translate>{detail.review.title}</span>
              ) : (
                "提交支出审核"
              )}
            </h2>
            {detail && (
              <Link
                className={buttonVariants({
                  variant: "ghost",
                  className: "min-h-11 px-2",
                })}
                href="/spending-review/new"
              >
                <Plus aria-hidden="true" />
                新建审核
              </Link>
            )}
          </div>
          {detail && selectedStatus ? (
            <SpendingReviewDetail
              data={detail}
              status={selectedStatus}
              now={now}
            />
          ) : (
            <SpendingReviewForm anchors={anchors} />
          )}
        </section>
        <SpendingReviewRecords
          records={records}
          selectedId={selectedId}
          nextCoolingAt={nextCoolingAt}
        />
      </div>
    </main>
  );
}
