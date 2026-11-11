import { z } from "zod";

export const HABIT_SLOTS = [1, 2] as const;
export const HABIT_HEATMAP_WEEKS = 13;
export const DAYS_PER_WEEK = 7;
const MILLISECONDS_PER_DAY = 86_400_000;
export const HABIT_KIND_LABELS = {
  quick: "通用打卡",
  project: "项目开发",
  reading: "论文阅读",
} as const;
export const PAPER_DIRECTION_LABELS = {
  ai: "AI",
  network: "计算机网络",
} as const;

const id = z.uuid();
const name = z.string().trim().min(1).max(20);
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => value || null);
const requiredText = z.string().trim().min(1).max(2000);
const evidenceUrl = z
  .union([z.literal(""), z.url({ protocol: /^https?$/ }).max(1500)])
  .optional()
  .transform((value) => value || null);

export const habitCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add"),
    id,
    name,
    kind: z.enum(["quick", "project", "reading"]),
  }),
  z.object({ type: z.literal("rename"), id, name }),
  z.object({ type: z.enum(["park", "delete"]), id }),
  z.object({
    type: z.literal("activate"),
    id,
    replace: z
      .object({ id, slot: z.union([z.literal(1), z.literal(2)]) })
      .optional(),
  }),
  z.object({
    type: z.literal("addPaper"),
    id,
    title: z.string().trim().min(1).max(200),
    direction: z.enum(["ai", "network"]),
  }),
  z.object({ type: z.literal("selectPaper"), id, paperId: id }),
  z.object({
    type: z.literal("next"),
    id,
    paperId: id.optional(),
    nextStep: optionalText,
  }),
  z.object({
    type: z.literal("record"),
    id,
    requestId: z.uuid(),
    paperId: id.optional(),
    progress: optionalText,
    nextStep: optionalText,
    evidenceUrl,
  }),
  z.object({
    type: z.literal("breakpoint"),
    id,
    thought: requiredText,
    angle: requiredText,
    experiment: requiredText,
  }),
  z.object({
    type: z.literal("adoptBreakpoint"),
    id,
    experiment: requiredText,
  }),
]);

export type HabitCommand = z.input<typeof habitCommandSchema>;
export type ValidHabitCommand = z.output<typeof habitCommandSchema>;
export type HabitResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function habitHeatmapDays(today: string) {
  const date = new Date(today + "T12:00:00Z");
  const daysSinceMonday = (date.getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  const firstDay =
    date.getTime() -
    ((HABIT_HEATMAP_WEEKS - 1) * DAYS_PER_WEEK + daysSinceMonday) *
      MILLISECONDS_PER_DAY;
  return Array.from({ length: HABIT_HEATMAP_WEEKS * DAYS_PER_WEEK }, (_, index) =>
    new Date(firstDay + index * MILLISECONDS_PER_DAY).toISOString().slice(0, 10),
  );
}
