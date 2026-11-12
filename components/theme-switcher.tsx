"use client"

import { Palette } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useState } from "react"

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme()
  const [open, setOpen] = useState(false)

  const themes = [
    { id: "graphite" as const, label: "石墨", color: "oklch(0.83 0.145 85)" },
    { id: "petrol" as const, label: "汽油蓝", color: "oklch(0.65 0.18 258)" },
    { id: "wine" as const, label: "酒红", color: "oklch(0.63 0.2 25)" },
  ]

  const modes = [
    { id: "light" as const, label: "亮色" },
    { id: "dark" as const, label: "暗色" },
    { id: "system" as const, label: "跟随系统" },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="切换主题"
      >
        <Palette className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="mb-3">
              <div className="mb-2 text-sm font-medium text-foreground">配色方案</div>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
                      theme === t.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted hover:bg-accent"
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-foreground">模式</div>
              <div className="space-y-1">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      mode === m.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
