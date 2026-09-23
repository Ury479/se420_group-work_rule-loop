import { NextResponse } from "next/server"
import { updateWeaknessEvent } from "@/app/actions/weakness"
import { z } from "zod"

const patchSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const eventId = Number(id)
  if (Number.isNaN(eventId)) {
    return NextResponse.json({ error: "无效的事件 ID" }, { status: 400 })
  }
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "无效的状态" }, { status: 400 })
  }
  const result = await updateWeaknessEvent({
    eventId,
    status: parsed.data.status,
  })
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
