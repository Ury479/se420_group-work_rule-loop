import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { weaknessPatterns } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  triggerSignals: z.string().max(1000).optional().nullable(),
  defaultIntervention: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  const { id } = await params
  const patternId = Number(id)
  if (Number.isNaN(patternId)) {
    return NextResponse.json({ error: "无效的模式 ID" }, { status: 400 })
  }
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "输入无效" },
      { status: 400 }
    )
  }
  const [updated] = await db
    .update(weaknessPatterns)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(eq(weaknessPatterns.id, patternId), eq(weaknessPatterns.userId, userId))
    )
    .returning()
  if (!updated) {
    return NextResponse.json({ error: "模式不存在" }, { status: 404 })
  }
  return NextResponse.json({ pattern: updated })
}
