import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDown,
  ArrowRight,
  CircleUserRound,
  Hourglass,
} from "lucide-react";
import { getUpcomingTaskDeadlines } from "@/app/actions/entropy-principles";
import { getLifespanSummary } from "@/app/actions/lifespan";
import { getConversionCheckIn } from "@/app/actions/spend-conversion";
import { DayPhaseGate } from "@/components/day-phase-gate";
import { LifespanNearTerm } from "@/components/lifespan-near-term";
import { LifespanPanel } from "@/components/lifespan-panel";
import { LifeWeeksHeatmap } from "@/components/life-weeks-heatmap";
import { HudHeader, StatusPill } from "@/components/hud";
import { LIFESPAN_REFERENCE_YEARS } from "@/lib/lifespan-progress";

export const metadata: Metadata = { title: "寿命倒计时" };

export default async function LifespanPage() {
  const [summary, deadlines, checkIn] = await Promise.all([
    getLifespanSummary(),
    getUpcomingTaskDeadlines(),
    getConversionCheckIn(),
  ]);

  return (
    <main className="w-full">
      <HudHeader
        className="border-b-0 pb-0 max-sm:[&_h1]:text-[1.375rem]"
        icon={Hourglass}
        tone="gold"
        eyebrow="Entropy · Lifespan"
        title="寿命倒计时"
        description={
          <>
            {`以出生日期的 ${LIFESPAN_REFERENCE_YEARS} 周年为规划参考，也可以查看未来一周的到期事项。`}{" "}
            <a
              href="#life-weeks"
              className="inline-flex min-h-11 items-center gap-1 rounded-sm text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              查看人生热力图
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </a>
          </>
        }
        action={
          summary.configured ? (
            <StatusPill
              tone={summary.todayScore !== null ? "green" : "red"}
              dot
            >
              {summary.todayScore !== null ? "今日已打分" : "今日未打分"}
            </StatusPill>
          ) : null
        }
      />
      <nav
        aria-label="继续手头的事"
        className="mt-3 flex flex-wrap items-center gap-2 border-b border-border pb-3 text-sm"
      >
        <Link
          href="/habits"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-input px-3 font-medium hover:bg-muted"
        >
          继续上次
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          工作台
        </Link>
        <Link
          href="/settings"
          aria-label="个人设置"
          className="ml-auto flex size-11 items-center justify-center rounded-full border border-input text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <CircleUserRound className="size-5" aria-hidden="true" />
        </Link>
      </nav>
      <div className="mt-6 flex flex-col gap-6">
        <LifespanPanel key={summary.today} initial={summary}>
          <LifespanNearTerm deadlines={deadlines} checkIn={checkIn} />
        </LifespanPanel>
        <Suspense fallback={null}>
          <DayPhaseGate />
        </Suspense>
        <LifeWeeksHeatmap progress={summary.configured ? summary : null} />
      </div>
    </main>
  );
}
