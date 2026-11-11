import type { Metadata } from "next";
import { HabitWorkspace } from "@/components/habit-workspace";
import { withAccount } from "@/lib/action";
import { readHabitDashboard } from "@/lib/habit-store";

export const metadata: Metadata = { title: "继续上次" };

export default async function HabitsPage() {
  const data = await withAccount(() => readHabitDashboard());
  return <HabitWorkspace data={data} />;
}
