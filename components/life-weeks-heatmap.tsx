// 人生周热力图:80 岁基准,每格 1 周。绿色 = 已度过,灰色 = 剩余。
// 纯展示组件(服务端渲染),绿色深浅按周序号确定性变化,模拟参考图的纹理感。

const TOTAL_YEARS = 80
const WEEKS_PER_YEAR = 52
const TOTAL_WEEKS = TOTAL_YEARS * WEEKS_PER_YEAR

// 确定性伪随机:同一格子每次渲染颜色一致
const GREEN_SHADES = [
  "bg-emerald-200/70",
  "bg-emerald-300/80",
  "bg-emerald-400/80",
  "bg-emerald-300/60",
  "bg-emerald-500/70",
]

function shadeOf(week: number): string {
  const h = (week * 2654435761) % 4294967296
  return GREEN_SHADES[h % GREEN_SHADES.length]
}

export function LifeWeeksHeatmap({ daysUsed }: { daysUsed: number }) {
  const weeksUsed = Math.min(Math.floor(daysUsed / 7), TOTAL_WEEKS)
  const currentWeek = weeksUsed < TOTAL_WEEKS ? weeksUsed : -1
  const yearsUsed = Math.floor(weeksUsed / WEEKS_PER_YEAR)

  return (
    <section aria-labelledby="life-weeks-title" className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="life-weeks-title" className="font-serif text-lg">
          生命清单
        </h2>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {`${weeksUsed.toLocaleString()} / ${TOTAL_WEEKS.toLocaleString()} 周`}
        </p>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {`每一格是一周,一行是一年。第 ${yearsUsed + 1} 年正在进行。`}
      </p>

      <div
        role="img"
        aria-label={`人生 ${TOTAL_YEARS} 年周历,已度过 ${weeksUsed} 周,剩余 ${(TOTAL_WEEKS - weeksUsed).toLocaleString()} 周`}
        className="mt-4 grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${WEEKS_PER_YEAR}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
          const past = i < weeksUsed
          const isCurrent = i === currentWeek
          return (
            <div
              key={i}
              className={`aspect-square rounded-[2px] ${
                isCurrent ? "animate-pulse bg-emerald-600" : past ? shadeOf(i) : "bg-muted"
              }`}
            />
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[2px] bg-emerald-400/80" />
          已度过
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[2px] bg-emerald-600" />
          本周
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[2px] bg-muted" />
          剩余
        </span>
      </div>
    </section>
  )
}
