import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, ListChecks } from "lucide-react";
import type { getUpcomingTaskDeadlines } from "@/app/actions/entropy-principles";
import type { getConversionCheckIn } from "@/app/actions/spend-conversion";
import { HudPanel, StatusPill } from "@/components/hud";
import { calendarTime, calendarToday } from "@/lib/calendar";
import { isCooldownOver } from "@/lib/convert-domain";

function monthDay(date: string) {
  return `${date.slice(5, 7)} 月 ${date.slice(8, 10)} 日`;
}

export function LifespanNearTerm({
  deadlines,
  checkIn,
}: {
  deadlines: Awaited<ReturnType<typeof getUpcomingTaskDeadlines>>;
  checkIn: Awaited<ReturnType<typeof getConversionCheckIn>>;
}) {
  const { today, lastDay, timeZone, tasks } = deadlines;
  const items: {
    href: string;
    title: string;
    at: Date;
    kind: "task" | "cooldown";
  }[] = tasks.map(({ id, title, deadline }) => ({
    href: `/tasks?task=${id}#task-${id}`,
    title,
    at: deadline,
    kind: "task",
  }));

  if (checkIn && !isCooldownOver(checkIn.cooldownEndsAt)) {
    const day = calendarToday(checkIn.cooldownEndsAt, timeZone);
    if (day >= today && day <= lastDay) {
      items.push({
        href: `/convert/${checkIn.id}`,
        title: "打开换算记录",
        at: checkIn.cooldownEndsAt,
        kind: "cooldown",
      });
    }
  }
  items.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <HudPanel
      id="near-term"
      aria-labelledby="near-term-title"
      tabIndex={-1}
      className="scroll-mt-6 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="near-term-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <CalendarDays className="size-5 text-primary" aria-hidden="true" />
            接下来 7 天
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            <time dateTime={today}>{monthDay(today)}</time> –{" "}
            <time dateTime={lastDay}>{monthDay(lastDay)}</time> ·{" "}
            <span className="wrap-anywhere">{timeZone}</span>
          </p>
        </div>
        <StatusPill>从今天起</StatusPill>
      </div>

      {items.length > 0 ? (
        <ol className="mt-3 divide-y divide-border border-y border-border">
          {items.map((item, index) => {
            const isCooldown = item.kind === "cooldown";
            const ItemIcon = isCooldown ? Clock : ListChecks;
            const id = `near-term-item-${index}`;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={isCooldown ? false : undefined}
                  scroll={isCooldown ? undefined : false}
                  aria-labelledby={`${id}-title`}
                  aria-describedby={`${id}-time ${id}-kind`}
                  className="grid min-h-16 grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2 py-2.5 transition-colors hover:bg-accent/45 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:grid-cols-[5.25rem_minmax(0,1fr)_auto] sm:gap-4"
                >
                  <time
                    id={`${id}-time`}
                    dateTime={item.at.toISOString()}
                    className="grid gap-0.5 text-xs tabular-nums text-muted-foreground"
                  >
                    <span>{monthDay(calendarToday(item.at, timeZone))}</span>{" "}
                    <span className="text-foreground">
                      {calendarTime(item.at, timeZone)}
                    </span>
                  </time>
                  <div className="min-w-0">
                    <p
                      id={`${id}-title`}
                      data-no-translate={isCooldown ? undefined : ""}
                      className="wrap-anywhere text-sm font-semibold"
                    >
                      {item.title}
                    </p>
                    <p
                      id={`${id}-kind`}
                      className={`mt-0.5 flex items-center gap-1 text-xs ${isCooldown ? "text-primary" : "text-info"}`}
                    >
                      <ItemIcon
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      {isCooldown ? "冷静期结束" : "任务截止"}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 border-y border-border py-4 text-sm text-muted-foreground">
          接下来 7 天没有到期事项。
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          显示最多 3 项到期任务。打开原任务可更新期限或完成状态。
        </p>
        <Link
          href="/tasks"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          查看任务清单
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </HudPanel>
  );
}
