import { NextResponse } from "next/server"
import { detectTodayWeaknesses } from "@/app/actions/weakness"

export async function POST() {
  const result = await detectTodayWeaknesses()
  return NextResponse.json(result)
}
