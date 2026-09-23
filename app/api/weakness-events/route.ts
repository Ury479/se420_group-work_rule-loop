import { NextResponse } from "next/server"
import { getWeaknessEvents } from "@/app/actions/weakness"
import { db } from "@/lib/db"
import { weaknessEvents } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { z } from "zod"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as
    | "open"
    | "acknowledged"
    | "resolved"
    | null
  const events = await getWeaknessEvents(status ?? undefined)
  return NextResponse.json({ events })
}

const createEventSchema = z.object({
  weaknessKey: z.enum([
    "scope_greed",
    "rush_finish",
    "careless_jump",
    "people_pleasing",
    "impulsive_spending",
    "scattered_focus",
  ]),
  sourceType: z
    .enum(["task", "purchase", "relationship", "review", "confirmation", "demand", "custom"])
    .default("custom"),
  sourceId: z.number().int().optional().nullable(),
  triggerReason: z.string().min(1).max(500),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  recommendedIntervention: z.string().max(500).optional().nullable(),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  const body = await request.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "输入无效" },
      { status: 400 }
    )
  }
  const [event] = await db
    .insert(weaknessEvents)
    .values({ userId, ...parsed.data })
    .returning()
  return NextResponse.json({ event }, { status: 201 })
}
