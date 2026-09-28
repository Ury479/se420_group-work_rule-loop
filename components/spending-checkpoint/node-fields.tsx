"use client"

import { useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, ReviewSelect } from "./fields"
import { TIME_ZONES, type Checkpoint } from "@/lib/spending-checkpoint-preview"

export function NodeFields({ initial }: { initial?: Checkpoint | null }) {
  const id = useId()
  const [kind, setKind] = useState(initial?.kind ?? "date")
  return <FieldGroup>
    <Field id={`${id}-kind`} label="什么时候回来判断">
      <ReviewSelect id={`${id}-kind`} name="nodeKind" value={kind} onChange={(e) => setKind(e.target.value as "date" | "milestone")}>
        <option value="date">明确日期</option><option value="milestone">里程碑＋兜底日期</option>
      </ReviewSelect>
    </Field>
    {kind === "milestone" && <Field id={`${id}-milestone`} label="由我确认的里程碑" hint="不会自动判断外部任务完成；即使没完成，也可在兜底日期回来看看。">
      <Input id={`${id}-milestone`} name="milestone" required maxLength={200} defaultValue={initial?.milestone} placeholder="例如：完成一次动态规划作业后" />
    </Field>}
    <div className="grid min-w-0 gap-5 sm:grid-cols-2">
      <Field id={`${id}-time`} label={kind === "milestone" ? "兜底检查日期与时间" : "回访日期与时间"}>
        <Input id={`${id}-time`} name="localTime" type="datetime-local" required defaultValue={initial?.localTime} className="min-w-0 max-w-full" />
      </Field>
      <Field id={`${id}-zone`} label="时间所属时区">
        <ReviewSelect id={`${id}-zone`} name="timeZone" defaultValue={initial?.timeZone ?? "Asia/Shanghai"}>
          {TIME_ZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </ReviewSelect>
      </Field>
    </div>
  </FieldGroup>
}
