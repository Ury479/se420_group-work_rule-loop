import type { LifespanSummary } from "@/app/actions/lifespan";
import {
  LIFESPAN_REFERENCE_YEARS,
  LIFESPAN_SLOTS_PER_YEAR,
  LIFESPAN_TOTAL_SLOTS,
} from "@/lib/lifespan-progress";

// 确定性伪随机:同一格子每次渲染颜色一致
const COMPLETED_SHADES = [
  "bg-success/35",
  "bg-success/42",
  "bg-success/48",
  "bg-success/55",
  "bg-success/62",
];

function shadeOf(slot: number): string {
  const h = (slot * 2654435761) % 4294967296;
  return COMPLETED_SHADES[h % COMPLETED_SHADES.length];
}

export function LifeWeeksHeatmap({
  progress,
}: {
  progress: Pick<
    LifespanSummary,
    "completedSlots" | "currentYear" | "weeksRemaining"
  > | null;
}) {
  const completedSlots = progress?.completedSlots ?? 0;
  const currentSlot = progress?.currentYear != null ? completedSlots : -1;
  const slotProgress = `${completedSlots.toLocaleString()} / ${LIFESPAN_TOTAL_SLOTS.toLocaleString()} 格`;
  const gridLabel = progress
    ? `人生 ${LIFESPAN_REFERENCE_YEARS} 年周历，已度过 ${slotProgress}，剩余 ${progress.weeksRemaining.toLocaleString()} 个整周`
    : `人生 ${LIFESPAN_REFERENCE_YEARS} 年周历预览，尚未设置出生日期`;

  return (
    <section
      id="life-weeks"
      aria-labelledby="life-weeks-title"
      tabIndex={-1}
      className="scroll-mt-6 rounded-lg border border-border bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="life-weeks-title" className="font-serif text-lg">
          人生热力图
        </h2>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {progress ? slotProgress : "周格预览"}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {!progress
          ? "每格约一周，一行约一年。设置出生日期后会标出已度过的周格。"
          : progress.currentYear === null
            ? `每格约一周，一行约一年。已到达 ${LIFESPAN_REFERENCE_YEARS} 年规划参考点。`
            : `每格约一周，一行约一年。第 ${progress.currentYear} 年正在进行。`}
      </p>

      <div
        role="img"
        aria-label={gridLabel}
        className="mt-4 grid gap-px sm:gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${LIFESPAN_SLOTS_PER_YEAR}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: LIFESPAN_TOTAL_SLOTS }, (_, i) => {
          const past = i < completedSlots;
          const isCurrent = i === currentSlot;
          return (
            <div
              key={i}
              className={`aspect-square rounded-[2px] ${
                isCurrent
                  ? "animate-pulse bg-success"
                  : past
                    ? shadeOf(i)
                    : "bg-muted"
              }`}
            />
          );
        })}
      </div>

      {progress ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-[2px] bg-success/48"
            />
            已度过
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-[2px] bg-success"
            />
            当前格
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-[2px] bg-muted"
            />
            剩余
          </span>
        </div>
      ) : null}
    </section>
  );
}
