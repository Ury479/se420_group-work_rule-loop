import { withApiAccount } from "@/lib/action";
import { NextResponse } from "next/server";
import { detectTodayWeaknesses } from "@/app/actions/weakness";

export async function POST() {
  return withApiAccount(async () => {
    const result = await detectTodayWeaknesses();
    return NextResponse.json(result);
  });
}
