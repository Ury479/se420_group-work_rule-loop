"use client";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { DAYS_PER_WEEK, HABIT_HEATMAP_WEEKS } from "@/lib/habit-domain";
import type { HabitDashboard } from "@/lib/habit-store";
import styles from "./habit-workspace.module.css";

const dateNavigation = new Map([
  ["ArrowLeft", -DAYS_PER_WEEK],
  ["ArrowRight", DAYS_PER_WEEK],
  ["ArrowUp", -1],
  ["ArrowDown", 1],
]);

function countLabel(count: number, locale: string) {
  if (locale === "en")
    return count + (count === 1 ? " check-in" : " check-ins");
  return count + " 次打卡";
}

export function HabitHeatmap({
  data,
  locale,
}: {
  data: Pick<HabitDashboard, "tracks" | "days" | "today" | "counts">;
  locale: "en" | "zh-CN";
}) {
  const { days, today, tracks } = data;
  const [selectedHabit, setSelectedHabit] = useState("");
  const [tooltipDay, setTooltipDay] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState(today);
  const calendar = useRef<HTMLDivElement>(null);
  const navigationHint = useId();
  const filter = tracks.some((habit) => habit.id === selectedHabit)
    ? selectedHabit
    : "";
  const tabDay =
    days.includes(focusedDay) && focusedDay <= today ? focusedDay : today;
  const cells = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { habitId, day, count } of data.counts) {
      if (!filter || habitId === filter) {
        counts.set(day, (counts.get(day) ?? 0) + count);
      }
    }
    const dateFormat = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
      timeZone: "UTC",
    });
    const monthFormat = new Intl.DateTimeFormat(locale, {
      month: locale === "zh-CN" ? "long" : "short",
      timeZone: "UTC",
    });
    return days.map((day) => {
      const date = new Date(day + "T12:00:00Z");
      return {
        day,
        label: dateFormat.format(date),
        monthLabel: monthFormat.format(date),
        count: counts.get(day) ?? 0,
      };
    });
  }, [data.counts, days, filter, locale]);

  const tooltipIndex = tooltipDay === null ? -1 : days.indexOf(tooltipDay);
  const tooltip = cells[tooltipIndex];

  function dismissDay(day: string) {
    setTooltipDay((current) => (current === day ? null : current));
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape") {
      setTooltipDay(null);
      return;
    }
    const offset = dateNavigation.get(event.key);
    if (offset === undefined) return;
    event.preventDefault();
    const next = index + offset;
    if (
      Math.abs(offset) === 1 &&
      Math.floor(next / DAYS_PER_WEEK) !== Math.floor(index / DAYS_PER_WEEK)
    ) {
      return;
    }
    const day = days[next];
    if (day && day <= today) {
      calendar.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${day}"]`)
        ?.focus();
    }
  }

  return (
    <section
      className={styles.heatmap}
      aria-labelledby="habit-heat-title"
      data-empty={!tracks.length}
    >
      <div className={styles.heatmapControls}>
        <h2 id="habit-heat-title">打卡热力图</h2>
        {tracks.length > 1 && (
          <select
            className={styles.heatmapFilter}
            aria-label="筛选热力图习惯"
            value={filter}
            onChange={(event) => {
              setSelectedHabit(event.target.value);
              setTooltipDay(null);
            }}
          >
            <option value="">全部习惯</option>
            {tracks.map((habit) => (
              <option key={habit.id} value={habit.id} data-no-translate>
                {habit.name}
              </option>
            ))}
          </select>
        )}
        {tracks.length > 0 && (
          <div className={styles.legend} aria-label="打卡次数图例" role="group">
            <span>0</span>
            <i aria-hidden="true" />
            <i data-level="1" aria-hidden="true" />
            <i data-level="2" aria-hidden="true" />
            <span>2+</span>
          </div>
        )}
      </div>
      {tracks.length ? (
        <>
          <span className="sr-only" id={navigationHint}>
            用方向键查看日期
          </span>
          <div
            className={styles.calendar}
            ref={calendar}
            role="group"
            aria-label="最近十三周的每日打卡"
            aria-describedby={navigationHint}
          >
            {Array.from({ length: HABIT_HEATMAP_WEEKS }, (_, weekIndex) => {
              const start = weekIndex * DAYS_PER_WEEK;
              const week = cells.slice(start, start + DAYS_PER_WEEK);
              const firstMonth = week[0].day.slice(0, 7);
              const showLeadingMonth =
                weekIndex === 0 &&
                days[2 * DAYS_PER_WEEK - 1].startsWith(firstMonth);
              const month =
                week.find(({ day }) => day.endsWith("-01") && day <= today) ??
                (showLeadingMonth ? week[0] : undefined);
              return (
                <div className={styles.calendarWeek} key={week[0].day}>
                  {week.map(({ day, label, count }, offset) =>
                    day > today ? (
                      <span key={day} data-future="" aria-hidden="true" />
                    ) : (
                      <button
                        key={day}
                        className={styles.calendarDay}
                        type="button"
                        tabIndex={day === tabDay ? 0 : -1}
                        aria-label={label + " · " + countLabel(count, locale)}
                        aria-current={day === today ? "date" : undefined}
                        data-no-translate
                        data-day={day}
                        data-count={count}
                        data-level={Math.min(count, 2)}
                        data-highlighted={day === tooltipDay}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== "touch") setTooltipDay(day);
                        }}
                        onPointerLeave={(event) => {
                          if (event.pointerType !== "touch") dismissDay(day);
                        }}
                        onFocus={() => {
                          setFocusedDay(day);
                          setTooltipDay(day);
                        }}
                        onBlur={() => dismissDay(day)}
                        onClick={(event) => {
                          event.currentTarget.focus({ preventScroll: true });
                          setTooltipDay(day);
                        }}
                        onKeyDown={(event) => navigate(event, start + offset)}
                      />
                    ),
                  )}
                  {month && (
                    <time
                      className={styles.calendarMonth}
                      dateTime={month.day.slice(0, 7)}
                      data-no-translate
                    >
                      {month.monthLabel}
                    </time>
                  )}
                </div>
              );
            })}
            {tooltip && (
              <span
                className={styles.calendarTooltip}
                role="tooltip"
                data-no-translate
                data-placement={
                  tooltipIndex % DAYS_PER_WEEK < 3 ? "below" : "above"
                }
                style={
                  {
                    "--tooltip-x":
                      (100 * (Math.floor(tooltipIndex / DAYS_PER_WEEK) + 0.5)) /
                        HABIT_HEATMAP_WEEKS +
                      "%",
                    "--tooltip-row": tooltipIndex % DAYS_PER_WEEK,
                  } as CSSProperties
                }
              >
                <time dateTime={tooltip.day}>{tooltip.label}</time>
                <span>{countLabel(tooltip.count, locale)}</span>
              </span>
            )}
          </div>
        </>
      ) : (
        <p className={styles.empty}>
          启用或添加一项习惯后，这里会显示每天的打卡。
        </p>
      )}
    </section>
  );
}
