"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import type { TrendPoint } from "@/components/morning-routine-panel"

// HH:mm → 小数小时;入睡时间归一到「相对当晚」轴(18:00 起算,凌晨算 24+)
function toSleepAxis(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(":").map(Number)
  const v = h + m / 60
  return v < 12 ? v + 24 : v
}

function toWakeAxis(t: string | null): number | null {
  if (!t) return null
  const [h, m] = t.split(":").map(Number)
  return h + m / 60
}

function fmtHour(v: number): string {
  const h = Math.floor(v) % 24
  const m = Math.round((v - Math.floor(v)) * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function RhythmTrendChart({ data }: { data: TrendPoint[] }) {
  const points = data.map((d) => ({
    day: d.date.slice(5), // MM-DD
    sleep: toSleepAxis(d.sleepTime),
    wake: toWakeAxis(d.wakeTime),
  }))

  const hasData = points.some((p) => p.sleep !== null || p.wake !== null)
  if (!hasData) {
    return (
      <p className="py-8 text-center text-sm leading-relaxed text-muted-foreground">
        还没有节律数据。记录几天入睡与起床时间后,这里会出现趋势线。
      </p>
    )
  }

  return (
    <div className="h-56 w-full" role="img" aria-label="近 7 天入睡与起床时间趋势图">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
          <YAxis
            domain={[4, 28]}
            ticks={[6, 12, 18, 24]}
            tickFormatter={fmtHour}
            tick={{ fontSize: 11 }}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? fmtHour(value) : "—",
              name === "sleep" ? "入睡" : "起床",
            ]}
            contentStyle={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="sleep"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name="sleep"
          />
          <Line
            type="monotone"
            dataKey="wake"
            stroke="var(--color-muted-foreground)"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ r: 3 }}
            connectNulls
            name="wake"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
