"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  BOUNDARY_CHECK_ITEMS,
  BOUNDARY_SUGGESTIONS,
} from "@/lib/relationships"
import { ShieldCheck } from "lucide-react"

export function BoundaryCheck({
  relationshipId,
  boundaryNotes,
}: {
  relationshipId: number
  boundaryNotes: string | null
}) {
  const router = useRouter()
  const [reviewed, setReviewed] = useState<boolean[]>(
    BOUNDARY_CHECK_ITEMS.map(() => false)
  )
  const allReviewed = reviewed.every(Boolean)

  return (
    <div className="flex flex-col gap-4">
      {boundaryNotes && (
        <Card className="border-l-4 border-l-destructive py-3">
          <CardContent className="px-4 text-sm leading-relaxed">
            <span className="font-semibold">我的底线:</span>
            {boundaryNotes}
          </CardContent>
        </Card>
      )}

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <p className="text-sm text-muted-foreground">
            逐条诚实地问自己。勾选表示我已认真想过这个问题。
          </p>
          {BOUNDARY_CHECK_ITEMS.map((item, i) => (
            <label key={item} className="flex items-start gap-3">
              <Checkbox
                checked={reviewed[i]}
                onCheckedChange={(v) =>
                  setReviewed((prev) => prev.map((c, j) => (j === i ? v === true : c)))
                }
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">{item}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent className="flex flex-col gap-2 px-4">
          <h2 className="text-sm font-semibold">更稳健的做法</h2>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
            {BOUNDARY_SUGGESTIONS.map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button
        size="lg"
        disabled={!allReviewed}
        onClick={() => router.push(`/relationships/${relationshipId}`)}
        className="h-12 text-base"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
        我已想清楚,守住底线
      </Button>
    </div>
  )
}
