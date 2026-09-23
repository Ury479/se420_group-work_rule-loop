"use client"

import { useState, useTransition } from "react"
import { searchCases } from "@/app/actions/event-library"
import type { EventCase } from "@/lib/db/schema"
import { EventCaseCard } from "@/components/event-case-card"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export function EventSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<EventCase[] | null>(null)
  const [isPending, startTransition] = useTransition()

  function run() {
    const q = query.trim()
    if (!q) return
    startTransition(async () => {
      const rows = await searchCases(q)
      setResults(rows)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) run()
          }}
          placeholder="搜索标题、摘要、物品、标签…"
          aria-label="搜索案例"
          className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={run} disabled={isPending}>
          <Search className="size-4" aria-hidden="true" />
          搜索
        </Button>
      </div>

      {results !== null && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">找到 {results.length} 个案例</p>
          {results.map((c) => (
            <EventCaseCard key={c.id} eventCase={c} />
          ))}
        </div>
      )}
    </div>
  )
}
