import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { weaknessPatterns } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { WEAKNESS_LABELS, WEAKNESS_DESCRIPTIONS, WEAKNESS_INTERVENTIONS, type WeaknessKey } from "@/lib/weakness"
import { desc, eq } from "drizzle-orm"
import { z } from "zod"

/**
 * GET:返回用户的弱点模式。若用户还没有任何模式,自动播种 6 类默认短板。
 */
export async function GET() {
  const userId = await getUserId()
  let patterns = await db
    .select()
    .from(weaknessPatterns)
    .where(eq(weaknessPatterns.userId, userId))
    .orderBy(desc(weaknessPatterns.createdAt))

  if (patterns.length === 0) {
    const keys = Object.keys(WEAKNESS_LABELS) as WeaknessKey[]
    for (const key of keys) {
      await db.insert(weaknessPatterns).values({
        userId,
        weaknessKey: key,
        title: WEAKNESS_LABELS[key],
        description: WEAKNESS_DESCRIPTIONS[key],
        defaultIntervention: WEAKNESS_INTERVENTIONS[key].label,
        active: true,
      })
    }
    patterns = await db
      .select()
      .from(weaknessPatterns)
      .where(eq(weaknessPatterns.userId, userId))
      .orderBy(desc(weaknessPatterns.createdAt))
  }

  return NextResponse.json({ patterns })
}

const createPatternSchema = z.object({
  weaknessKey: z.enum([
    "scope_greed",
    "rush_finish",
    "careless_jump",
    "people_pleasing",
    "impulsive_spending",
    "scattered_focus",
  ]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  triggerSignals: z.string().max(1000).optional().nullable(),
  defaultIntervention: z.string().max(500).optional().nullable(),
})

export async function POST(request: Request) {
  const userId = await getUserId()
  const body = await request.json()
  const parsed = createPatternSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "输入无效" },
      { status: 400 }
    )
  }
  const [pattern] = await db
    .insert(weaknessPatterns)
    .values({ userId, ...parsed.data })
    .returning()
  return NextResponse.json({ pattern }, { status: 201 })
}
