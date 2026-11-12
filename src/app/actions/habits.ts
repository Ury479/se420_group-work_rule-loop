"use server";

import { revalidatePath } from "next/cache";
import { withAccount } from "@/lib/action";
import {
  habitCommandSchema,
  type HabitCommand,
  type HabitResult,
} from "@/lib/habit-domain";
import { applyHabitCommand } from "@/lib/habit-store";

export async function changeHabit(input: HabitCommand): Promise<HabitResult> {
  const parsed = habitCommandSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "请检查必填项、文字长度或链接格式。" };
  const result = await withAccount(() => applyHabitCommand(parsed.data));
  if (result.ok || result.error === "习惯状态已更新，请重新选择。")
    revalidatePath("/habits");
  return result;
}
