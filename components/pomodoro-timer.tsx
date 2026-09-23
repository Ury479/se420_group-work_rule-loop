"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, RotateCcw } from "lucide-react"

const TOTAL_SECONDS = 25 * 60

export function PomodoroTimer({ taskTitle }: { taskTitle?: string | null }) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false)
          setFinished(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [running])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")
  const progress = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100

  return (
    <div className="flex flex-col items-center gap-4">
      <p
        className="font-mono text-6xl tabular-nums tracking-tight"
        role="timer"
        aria-live={finished ? "assertive" : "off"}
        aria-label={finished ? "番茄钟结束" : `剩余 ${mm} 分 ${ss} 秒`}
      >
        {mm}:{ss}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
      {finished ? (
        <p role="status" className="text-sm font-medium text-primary">
          25 分钟完成。{taskTitle ? "去标记任务进度,或再来一轮。" : "休息 5 分钟再继续。"}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (finished) {
              setSecondsLeft(TOTAL_SECONDS)
              setFinished(false)
              setRunning(true)
            } else {
              setRunning((r) => !r)
            }
          }}
          className="flex min-h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {running ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          {finished ? "再来一轮" : running ? "暂停" : secondsLeft < TOTAL_SECONDS ? "继续" : "开始专注"}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setFinished(false)
            setSecondsLeft(TOTAL_SECONDS)
          }}
          className="flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          重置
        </button>
      </div>
    </div>
  )
}
