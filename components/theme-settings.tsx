"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/components/theme-provider"

export function ThemeSettings() {
  const { theme, mode, setTheme, setMode } = useTheme()

  const themes = [
    { id: "graphite" as const, label: "石墨", description: "深沉内敛，金色主色", color: "oklch(0.83 0.145 85)" },
    { id: "petrol" as const, label: "汽油蓝", description: "冷静专注，蓝色主色", color: "oklch(0.65 0.18 258)" },
    { id: "wine" as const, label: "酒红", description: "浓郁温暖，红色主色", color: "oklch(0.63 0.2 25)" },
  ]

  const modes = [
    { id: "light" as const, label: "亮色模式", description: "明亮清晰" },
    { id: "dark" as const, label: "暗色模式", description: "护眼舒适" },
    { id: "system" as const, label: "跟随系统", description: "自动切换" },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>主题外观</CardTitle>
        <CardDescription>选择配色方案与明暗模式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-3 text-sm font-medium">配色方案</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  theme === t.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div
                  className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: t.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-sm text-muted-foreground">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 text-sm font-medium">明暗模式</div>
          <div className="space-y-2">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                  mode === m.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{m.label}</div>
                  <div className="text-sm text-muted-foreground">{m.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="text-sm text-muted-foreground">
            主题设置保存在浏览器本地存储中，同一设备的不同浏览器需要分别设置。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
