"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  COMMUNICATION_CHECK_ITEMS,
  HIGH_RISK_COMM_COPY,
} from "@/lib/relationships"
import { CheckCircle2, TriangleAlert, Send } from "lucide-react"

export function CommunicationCheck({
  relationshipId,
  personName,
  highRisk,
  landmines,
  boundaryNotes,
}: {
  relationshipId: number
  personName: string
  highRisk: boolean
  landmines: string | null
  boundaryNotes: string | null
}) {
  const router = useRouter()
  const [checked, setChecked] = useState<boolean[]>(
    COMMUNICATION_CHECK_ITEMS.map(() => false)
  )
  const [done, setDone] = useState(false)
  const allChecked = checked.every(Boolean)

  if (done) {
    return (
      <Card className="border-success py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            五项确认完成。可以发送了。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如果内容涉及承诺时间、金钱、项目资源或情绪安抚,发送前建议再做一次底线防护检查。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/quick-check?action=send&target=${encodeURIComponent(personName)}`}
                />
              }
            >
              <Send className="size-4" aria-hidden="true" />
              走 90% 发送检查
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/relationships/${relationshipId}/boundary-check`} />}
            >
              底线防护检查
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push(`/relationships/${relationshipId}`)}
            >
              返回详情
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {highRisk && (
        <Card className="border-l-4 border-l-destructive py-3">
          <CardContent className="flex items-start gap-2 px-4 text-sm">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              <span className="font-semibold">高风险沟通对象。</span>
              {HIGH_RISK_COMM_COPY}
            </p>
          </CardContent>
        </Card>
      )}

      {(landmines || boundaryNotes) && (
        <Card className="py-3">
          <CardContent className="flex flex-col gap-1.5 px-4 text-sm text-muted-foreground">
            {landmines && <p>沟通雷区(推测):{landmines}</p>}
            {boundaryNotes && <p>我的底线:{boundaryNotes}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="py-5">
        <CardContent className="flex flex-col gap-4 px-5">
          {COMMUNICATION_CHECK_ITEMS.map((item, i) => (
            <label key={item} className="flex items-start gap-3">
              <Checkbox
                checked={checked[i]}
                onCheckedChange={(v) =>
                  setChecked((prev) => prev.map((c, j) => (j === i ? v === true : c)))
                }
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">{item}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Button
        size="lg"
        disabled={!allChecked}
        onClick={() => setDone(true)}
        className="h-12 text-base"
      >
        <CheckCircle2 className="size-5" aria-hidden="true" />
        五项已全部确认
      </Button>
      {!allChecked && (
        <p className="text-xs text-muted-foreground">
          先保存草稿。五项全部确认后才能继续。
        </p>
      )}
    </div>
  )
}
