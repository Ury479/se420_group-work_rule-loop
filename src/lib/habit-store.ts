import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { db, currentAccountId } from "@/db";
import { habitCheckins, habitPapers, habits } from "@/db/schema";
import { appTimeZone, calendarToday, parseCalendarDateTime } from "@/lib/calendar";
import {
  HABIT_SLOTS,
  habitHeatmapDays,
  type HabitResult,
  type ValidHabitCommand,
} from "@/lib/habit-domain";

const saved = (message: string): HabitResult => ({ ok: true, message });
const rejected = (error: string): HabitResult => ({ ok: false, error });
const stale = () => rejected("习惯状态已更新，请重新选择。");

async function findFreeSlot() {
  const occupied = await db
    .select({ slot: habits.activeSlot })
    .from(habits)
    .where(isNotNull(habits.activeSlot));
  return (
    HABIT_SLOTS.find((slot) => !occupied.some((row) => row.slot === slot)) ??
    null
  );
}

async function habitWithName(name: string) {
  const [match] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(
      and(
        isNull(habits.deletedAt),
        sql`lower(${habits.name}) = lower(${name})`,
      ),
    );
  return match;
}

// Each caller uses the authenticated account transaction.
export async function applyHabitCommand(
  command: ValidHabitCommand,
): Promise<HabitResult> {
  const userId = currentAccountId();
  if (!userId) throw new Error("Account context required");
  const [habit] = await db
    .select()
    .from(habits)
    .where(eq(habits.id, command.id));

  if (command.type === "add") {
    if (
      habit &&
      !habit.deletedAt &&
      habit.name === command.name &&
      habit.kind === command.kind
    ) {
      return saved(habit.activeSlot ? "已添加到正在养成" : "已添加到暂存区");
    }
    if (habit || (await habitWithName(command.name)))
      return rejected("已有同名习惯。");
    const activeSlot = await findFreeSlot();
    await db.insert(habits).values({
      id: command.id,
      userId,
      name: command.name,
      kind: command.kind,
      activeSlot,
    });
    return saved(activeSlot ? "已添加到正在养成" : "已添加到暂存区");
  }

  if (command.type === "record") {
    const [prior] = await db
      .select()
      .from(habitCheckins)
      .where(eq(habitCheckins.id, command.requestId));
    if (prior) {
      return prior.habitId === command.id &&
        prior.paperId === (command.paperId ?? null) &&
        prior.progress === command.progress &&
        prior.nextStep === command.nextStep &&
        prior.evidenceUrl === command.evidenceUrl
        ? saved("打卡已记录")
        : rejected("这次提交已处理，请重新打开记录表单。");
    }
  }
  if (!habit || habit.deletedAt) return stale();

  switch (command.type) {
    case "rename": {
      const match = await habitWithName(command.name);
      if (match && match.id !== habit.id) return rejected("已有同名习惯。");
      await db
        .update(habits)
        .set({ name: command.name })
        .where(eq(habits.id, habit.id));
      return saved("习惯名称已保存");
    }
    case "park":
      await db
        .update(habits)
        .set({ activeSlot: null })
        .where(eq(habits.id, habit.id));
      return saved("已移入暂存区");
    case "delete":
      await db
        .update(habits)
        .set({ deletedAt: new Date(), activeSlot: null })
        .where(eq(habits.id, habit.id));
      return saved("习惯已删除，历史已保留");
    case "activate": {
      if (habit.activeSlot) return stale();
      const { replace } = command;
      let slot = await findFreeSlot();
      if (replace) {
        if (slot) return stale();
        const [released] = await db
          .update(habits)
          .set({ activeSlot: null })
          .where(
            and(eq(habits.id, replace.id), eq(habits.activeSlot, replace.slot)),
          )
          .returning({ id: habits.id });
        if (!released) return stale();
        slot = replace.slot;
      }
      if (!slot) return stale();
      await db
        .update(habits)
        .set({ activeSlot: slot })
        .where(eq(habits.id, habit.id));
      return saved(replace ? "已切换正在养成的习惯" : "已启用习惯");
    }
  }

  if (!habit.activeSlot) return stale();
  const paperScope = eq(habitPapers.habitId, habit.id);
  if (command.type === "addPaper" || command.type === "selectPaper") {
    if (habit.kind !== "reading") return stale();
    const [existing] = await db
      .select()
      .from(habitPapers)
      .where(
        and(
          paperScope,
          command.type === "selectPaper"
            ? eq(habitPapers.id, command.paperId)
            : and(
                eq(habitPapers.title, command.title),
                eq(habitPapers.direction, command.direction),
              ),
        ),
      );
    if (!existing && command.type === "selectPaper") return stale();
    await db
      .update(habitPapers)
      .set({ isCurrent: false })
      .where(and(paperScope, eq(habitPapers.isCurrent, true)));
    if (existing) {
      await db
        .update(habitPapers)
        .set({ isCurrent: true })
        .where(eq(habitPapers.id, existing.id));
    } else if (command.type === "addPaper") {
      await db.insert(habitPapers).values({
        userId,
        habitId: habit.id,
        title: command.title,
        direction: command.direction,
        isCurrent: true,
      });
    }
    return saved("已更新当前论文");
  }

  if (command.type === "breakpoint" || command.type === "adoptBreakpoint") {
    if (habit.kind !== "project") return stale();
    if (command.type === "adoptBreakpoint") {
      if (habit.breakpoint?.experiment !== command.experiment) return stale();
      await db
        .update(habits)
        .set({ nextStep: habit.breakpoint.experiment })
        .where(eq(habits.id, habit.id));
      return saved("已将验证动作设为下一步");
    }
    await db
      .update(habits)
      .set({
        breakpoint: {
          thought: command.thought,
          angle: command.angle,
          experiment: command.experiment,
        },
      })
      .where(eq(habits.id, habit.id));
    return saved("已保存卡点，等待实际验证");
  }

  if (command.type === "next" || command.type === "record") {
    let paperId: string | null = null;
    if (habit.kind === "reading") {
      if (!command.paperId) return rejected("请先选择当前论文。");
      const [paper] = await db
        .select({ id: habitPapers.id })
        .from(habitPapers)
        .where(
          and(
            paperScope,
            eq(habitPapers.id, command.paperId),
            eq(habitPapers.isCurrent, true),
          ),
        );
      if (!paper) return stale();
      paperId = paper.id;
    } else if (command.paperId) return stale();

    if (command.type === "record") {
      if (habit.kind === "project" && !command.progress)
        return rejected("请写下一句实际产出。");
      if (habit.kind !== "project" && command.evidenceUrl) return stale();
      await db.insert(habitCheckins).values({
        id: command.requestId,
        userId,
        habitId: habit.id,
        paperId,
        progress: command.progress,
        nextStep: command.nextStep,
        evidenceUrl: command.evidenceUrl,
      });
    }
    if (paperId) {
      await db
        .update(habitPapers)
        .set({ nextStep: command.nextStep })
        .where(eq(habitPapers.id, paperId));
    } else {
      await db
        .update(habits)
        .set({ nextStep: command.nextStep })
        .where(eq(habits.id, habit.id));
    }
    return saved(command.type === "record" ? "打卡已记录" : "当前动作已保存");
  }
  return stale();
}

export async function readHabitDashboard(now = new Date()) {
  const list = await db
    .select({
      id: habits.id,
      name: habits.name,
      kind: habits.kind,
      activeSlot: habits.activeSlot,
      nextStep: habits.nextStep,
      breakpoint: habits.breakpoint,
    })
    .from(habits)
    .where(isNull(habits.deletedAt))
    .orderBy(asc(habits.activeSlot), asc(habits.createdAt), asc(habits.id));
  const active = list.filter((habit) => habit.activeSlot !== null);
  const activeIds = active.map((habit) => habit.id);
  const paperRows = activeIds.length
    ? await db
        .select({
          id: habitPapers.id,
          habitId: habitPapers.habitId,
          title: habitPapers.title,
          direction: habitPapers.direction,
          isCurrent: habitPapers.isCurrent,
          nextStep: habitPapers.nextStep,
        })
        .from(habitPapers)
        .where(inArray(habitPapers.habitId, activeIds))
        .orderBy(asc(habitPapers.title), asc(habitPapers.id))
    : [];
  const timeZone = appTimeZone();
  const today = calendarToday(now, timeZone);
  const days = habitHeatmapDays(today);
  const day = sql<string>`to_char(timezone(${timeZone}, ${habitCheckins.occurredAt}), 'YYYY-MM-DD')`;
  const since = parseCalendarDateTime(days[0] + "T00:00", timeZone);
  const counts = activeIds.length
    ? await db
        .select({
          habitId: habitCheckins.habitId,
          day,
          count: sql<number>`count(*)::int`,
        })
        .from(habitCheckins)
        .where(
          and(
            inArray(habitCheckins.habitId, activeIds),
            since ? gte(habitCheckins.occurredAt, since) : gte(day, days[0]),
          ),
        )
        .groupBy(habitCheckins.habitId, sql`2`)
    : [];

  const recent = await db
    .select({
      id: habitCheckins.id,
      habitId: habits.id,
      habitName: habits.name,
      deletedAt: habits.deletedAt,
      paperTitle: habitPapers.title,
      paperDirection: habitPapers.direction,
      progress: habitCheckins.progress,
      nextStep: habitCheckins.nextStep,
      occurredAt: habitCheckins.occurredAt,
      evidenceUrl: habitCheckins.evidenceUrl,
    })
    .from(habitCheckins)
    .innerJoin(habits, eq(habits.id, habitCheckins.habitId))
    .leftJoin(habitPapers, eq(habitPapers.id, habitCheckins.paperId))
    .orderBy(desc(habitCheckins.occurredAt), desc(habitCheckins.id))
    .limit(40);

  const tracks = [];
  for (const habit of active) {
    const papers = paperRows.filter((paper) => paper.habitId === habit.id);
    const paper = papers.find((item) => item.isCurrent);
    const scope = and(
      eq(habitCheckins.habitId, habit.id),
      paper
        ? eq(habitCheckins.paperId, paper.id)
        : isNull(habitCheckins.paperId),
    );
    const fields = {
      progress: habitCheckins.progress,
      occurredAt: habitCheckins.occurredAt,
    };
    const order = [desc(habitCheckins.occurredAt), desc(habitCheckins.id)];
    const [latest] =
      habit.kind !== "reading" || paper
        ? await db
            .select(fields)
            .from(habitCheckins)
            .where(scope)
            .orderBy(...order)
            .limit(1)
        : [];
    const [lastPosition] =
      paper && latest && !latest.progress
        ? await db
            .select(fields)
            .from(habitCheckins)
            .where(and(scope, isNotNull(habitCheckins.progress)))
            .orderBy(...order)
            .limit(1)
        : [];
    tracks.push({ ...habit, paper, papers, latest, lastPosition });
  }
  return { list, tracks, days, today, counts, recent, timeZone };
}

export type HabitDashboard = Awaited<ReturnType<typeof readHabitDashboard>>;
