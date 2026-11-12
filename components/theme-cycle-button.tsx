"use client"

import { Palette } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

export function ThemeCycleButton() {
  const { theme, cycleTheme } = useTheme()

  const themeLabels = {
    graphite: "石墨",
    petrol: "石油蓝",
    wine: "酒红",
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={`切换配色 (当前: ${themeLabels[theme]})`}
      title={`点击切换配色\n当前: ${themeLabels[theme]}`}
    >
      <Palette className="h-5 w-5" />
    </button>
  )
}
