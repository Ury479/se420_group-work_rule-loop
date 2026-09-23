"use server"

import { db } from "@/lib/db"
import {
  objectives,
  keyResults,
  treeTasks,
  type Objective,
  type KeyResult,
  type TreeTask,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, like, or, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────
// 校验
// ─────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1, "任务名称不能为空").max(200),
  parentId: z.number().int().positive().optional().nullable(),
  weight: z.number().int().min(1).max(100).optional(),
  keyResultId: z.number().int().positive().optional().nullable(),
  objectiveId: z.number().int().positive().optional().nullable(),
})

const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  progressMode: z.enum(["average", "weighted"]).optional(),
  keyResultId: z.number().int().positive().optional().nullable(),
})

// ─────────────────────────────────────────────
// 进度引擎:自动计算,不依赖手动填写
// 叶子:done=100,todo=0
// 父节点:平均模式 = 子进度平均;加权模式 = Σ(子进度×权重)/Σ权重
// ─────────────────────────────────────────────

async function recomputeProgress(userId: string, rootId: number) {
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.userId, userId), eq(treeTasks.rootId, rootId)))

  if (rows.length === 0) return

  const root = rows.find((r) => r.id === rootId)
  const mode = root?.progressMode ?? "weighted"

  const childrenOf = new Map<number, TreeTask[]>()
  for (const r of rows) {
    if (r.parentId != null) {
      const list = childrenOf.get(r.parentId) ?? []
      list.push(r)
      childrenOf.set(r.parentId, list)
    }
  }

  const computed = new Map<number, number>()
  function compute(node: TreeTask): number {
    const children = childrenOf.get(node.id) ?? []
    let value: number
    if (children.length === 0) {
      value = node.status === "done" ? 100 : 0
    } else if (mode === "average") {
      value = Math.round(
        children.reduce((s, c) => s + compute(c), 0) / children.length
      )
    } else {
      let totalWeight = 0
      let doneWeight = 0
      for (const c of children) {
        const p = compute(c)
        totalWeight += c.weight
        doneWeight += (p / 100) * c.weight
      }
      value = totalWeight === 0 ? 0 : Math.round((doneWeight / totalWeight) * 100)
    }
    computed.set(node.id, value)
    return value
  }
  if (root) compute(root)

  // 只写回有变化的节点
  for (const r of rows) {
    const next = computed.get(r.id)
    if (next != null && next !== r.progress) {
      await db
        .update(treeTasks)
        .set({ progress: next, updatedAt: new Date() })
        .where(and(eq(treeTasks.id, r.id), eq(treeTasks.userId, userId)))
    }
  }
}

function revalidateAll() {
  revalidatePath("/tasks")
  revalidatePath("/")
}

// ─────────────────────────────────────────────
// 读取:整棵森林 + OKR 映射(单次查询,按 path 排序)
// ─────────────────────────────────────────────

export type TaskTreeData = {
  objectives: (Objective & {
    progress: number
    keyResults: (KeyResult & { progress: number })[]
  })[]
  tasks: TreeTask[]
  overall: { progress: number; total: number; done: number }
}

export async function getTaskTreeData(): Promise<TaskTreeData> {
  const userId = await getUserId()
  const [objRows, krRows, taskRows] = await Promise.all([
    db.select().from(objectives).where(eq(objectives.userId, userId)),
    db
      .select()
      .from(keyResults)
      .where(eq(keyResults.userId, userId))
      .orderBy(asc(keyResults.sortOrder), asc(keyResults.id)),
    db
      .select()
      .from(treeTasks)
      .where(eq(treeTasks.userId, userId))
      .orderBy(asc(treeTasks.path), asc(treeTasks.sortOrder), asc(treeTasks.id)),
  ])

  // KR 进度 = 关联根任务进度的平均;Objective 进度 = KR 平均
  const rootTasks = taskRows.filter((t) => t.parentId == null)
  const krWithProgress = krRows.map((kr) => {
    const linked = rootTasks.filter((t) => t.keyResultId === kr.id)
    const progress =
      linked.length === 0
        ? 0
        : Math.round(linked.reduce((s, t) => s + t.progress, 0) / linked.length)
    return { ...kr, progress }
  })
  const objWithProgress = objRows.map((o) => {
    const krs = krWithProgress.filter((k) => k.objectiveId === o.id)
    const progress =
      krs.length === 0
        ? 0
        : Math.round(krs.reduce((s, k) => s + k.progress, 0) / krs.length)
    return { ...o, progress, keyResults: krs }
  })

  const leaves = taskRows.filter(
    (t) => !taskRows.some((c) => c.parentId === t.id)
  )
  const overallProgress =
    rootTasks.length === 0
      ? 0
      : Math.round(
          rootTasks.reduce((s, t) => s + t.progress, 0) / rootTasks.length
        )

  return {
    objectives: objWithProgress,
    tasks: taskRows,
    overall: {
      progress: overallProgress,
      total: leaves.length,
      done: leaves.filter((l) => l.status === "done").length,
    },
  }
}

// ─────────────────────────────────────────────
// OKR
// ─────────────────────────────────────────────

export async function createObjective(title: string) {
  const userId = await getUserId()
  const t = title.trim()
  if (!t) return { error: "目标不能为空" }
  await db.insert(objectives).values({ userId, title: t.slice(0, 200) })
  revalidateAll()
  return { success: true }
}

export async function createKeyResult(objectiveId: number, title: string) {
  const userId = await getUserId()
  const t = title.trim()
  if (!t) return { error: "关键结果不能为空" }
  await db
    .insert(keyResults)
    .values({ userId, objectiveId, title: t.slice(0, 200) })
  revalidateAll()
  return { success: true }
}

export async function deleteObjective(id: number) {
  const userId = await getUserId()
  await db
    .delete(keyResults)
    .where(and(eq(keyResults.objectiveId, id), eq(keyResults.userId, userId)))
  await db
    .delete(objectives)
    .where(and(eq(objectives.id, id), eq(objectives.userId, userId)))
  revalidateAll()
  return { success: true }
}

// ─────────────────────────────────────────────
// 任务 CRUD
// ─────────────────────────────────────────────

export async function createTreeTask(input: z.infer<typeof createTaskSchema>) {
  const userId = await getUserId()
  const parsed = createTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  let parent: TreeTask | null = null
  if (data.parentId) {
    const rows = await db
      .select()
      .from(treeTasks)
      .where(and(eq(treeTasks.id, data.parentId), eq(treeTasks.userId, userId)))
      .limit(1)
    if (rows.length === 0) return { error: "父任务不存在" }
    parent = rows[0]
  }

  // 末尾排序
  const siblings = await db
    .select({ sortOrder: treeTasks.sortOrder })
    .from(treeTasks)
    .where(
      and(
        eq(treeTasks.userId, userId),
        parent
          ? eq(treeTasks.parentId, parent.id)
          : eq(treeTasks.level, 0)
      )
    )
  const nextOrder =
    siblings.length === 0
      ? 0
      : Math.max(...siblings.map((s) => s.sortOrder)) + 1

  const [inserted] = await db
    .insert(treeTasks)
    .values({
      userId,
      title: data.title,
      parentId: parent?.id ?? null,
      rootId: parent?.rootId ?? null, // 根节点稍后指向自身
      level: parent ? parent.level + 1 : 0,
      sortOrder: nextOrder,
      weight: data.weight ?? 1,
      keyResultId: parent ? parent.keyResultId : (data.keyResultId ?? null),
      objectiveId: parent ? parent.objectiveId : (data.objectiveId ?? null),
    })
    .returning()

  // 物化路径:parent.path + "/" + id;根任务 rootId 指向自身
  const path = parent ? `${parent.path}/${inserted.id}` : `${inserted.id}`
  await db
    .update(treeTasks)
    .set({ path, rootId: parent ? parent.rootId : inserted.id })
    .where(eq(treeTasks.id, inserted.id))

  await recomputeProgress(userId, parent?.rootId ?? inserted.id)
  revalidateAll()
  return { success: true, id: inserted.id }
}

export async function updateTreeTask(input: z.infer<typeof updateTaskSchema>) {
  const userId = await getUserId()
  const parsed = updateTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, data.id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (data.title !== undefined) patch.title = data.title
  if (data.weight !== undefined) patch.weight = data.weight
  if (data.progressMode !== undefined) patch.progressMode = data.progressMode
  if (data.keyResultId !== undefined) patch.keyResultId = data.keyResultId

  await db
    .update(treeTasks)
    .set(patch)
    .where(and(eq(treeTasks.id, data.id), eq(treeTasks.userId, userId)))

  if (rows[0].rootId) await recomputeProgress(userId, rows[0].rootId)
  revalidateAll()
  return { success: true }
}

export async function toggleTaskStatus(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  const task = rows[0]

  await db
    .update(treeTasks)
    .set({
      status: task.status === "done" ? "todo" : "done",
      updatedAt: new Date(),
    })
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))

  if (task.rootId) await recomputeProgress(userId, task.rootId)
  revalidateAll()
  return { success: true }
}

export async function toggleTaskCollapsed(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select({ collapsed: treeTasks.collapsed })
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  await db
    .update(treeTasks)
    .set({ collapsed: !rows[0].collapsed })
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
  revalidateAll()
  return { success: true }
}

/** 删除任务及整个子树(基于 path 前缀,一次删完) */
export async function deleteTreeTask(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  const task = rows[0]

  await db
    .delete(treeTasks)
    .where(
      and(
        eq(treeTasks.userId, userId),
        or(eq(treeTasks.id, id), like(treeTasks.path, `${task.path}/%`))
      )
    )

  if (task.rootId && task.rootId !== id) {
    await recomputeProgress(userId, task.rootId)
  }
  revalidateAll()
  return { success: true }
}

// ─────────────────────────────────────────────
// 排序与层级调整
// ─────────────────────────────────────────────

async function getSiblings(userId: string, task: TreeTask) {
  return db
    .select()
    .from(treeTasks)
    .where(
      and(
        eq(treeTasks.userId, userId),
        task.parentId != null
          ? eq(treeTasks.parentId, task.parentId)
          : eq(treeTasks.level, 0)
      )
    )
    .orderBy(asc(treeTasks.sortOrder), asc(treeTasks.id))
}

/** 同级上移 / 下移 */
export async function moveTask(id: number, direction: "up" | "down") {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  const task = rows[0]

  const siblings = await getSiblings(userId, task)
  const idx = siblings.findIndex((s) => s.id === id)
  const swapWith =
    direction === "up" ? siblings[idx - 1] : siblings[idx + 1]
  if (!swapWith) return { success: true } // 已到边界

  await db
    .update(treeTasks)
    .set({ sortOrder: swapWith.sortOrder })
    .where(eq(treeTasks.id, task.id))
  await db
    .update(treeTasks)
    .set({ sortOrder: task.sortOrder })
    .where(eq(treeTasks.id, swapWith.id))

  revalidateAll()
  return { success: true }
}

/** 更新整个子树的 path / level / rootId(层级调整后调用) */
async function rebaseSubtree(
  userId: string,
  task: TreeTask,
  newParent: TreeTask | null
) {
  const oldPath = task.path
  const newPath = newParent ? `${newParent.path}/${task.id}` : `${task.id}`
  const levelDelta = (newParent ? newParent.level + 1 : 0) - task.level
  const newRootId = newParent ? newParent.rootId : task.id

  const subtree = await db
    .select()
    .from(treeTasks)
    .where(
      and(
        eq(treeTasks.userId, userId),
        or(eq(treeTasks.id, task.id), like(treeTasks.path, `${oldPath}/%`))
      )
    )

  for (const node of subtree) {
    await db
      .update(treeTasks)
      .set({
        path: node.path.replace(oldPath, newPath),
        level: node.level + levelDelta,
        rootId: newRootId,
        ...(node.id === task.id
          ? {
              parentId: newParent?.id ?? null,
              keyResultId: newParent ? newParent.keyResultId : node.keyResultId,
              objectiveId: newParent ? newParent.objectiveId : node.objectiveId,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(treeTasks.id, node.id))
  }
}

/** 降级:变成上一个兄弟的子任务 */
export async function indentTask(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  const task = rows[0]

  const siblings = await getSiblings(userId, task)
  const idx = siblings.findIndex((s) => s.id === id)
  const newParent = siblings[idx - 1]
  if (!newParent) return { error: "没有可以并入的上一个任务" }

  const oldRootId = task.rootId
  await rebaseSubtree(userId, task, newParent)

  if (oldRootId) await recomputeProgress(userId, oldRootId)
  if (newParent.rootId && newParent.rootId !== oldRootId) {
    await recomputeProgress(userId, newParent.rootId)
  }
  revalidateAll()
  return { success: true }
}

/** 升级:提升到父任务的同级 */
export async function outdentTask(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, id), eq(treeTasks.userId, userId)))
    .limit(1)
  if (rows.length === 0) return { error: "任务不存在" }
  const task = rows[0]
  if (task.parentId == null) return { error: "已经是顶级任务" }

  const parentRows = await db
    .select()
    .from(treeTasks)
    .where(and(eq(treeTasks.id, task.parentId), eq(treeTasks.userId, userId)))
    .limit(1)
  const parent = parentRows[0]
  const grandParentId = parent?.parentId ?? null

  let grandParent: TreeTask | null = null
  if (grandParentId != null) {
    const gpRows = await db
      .select()
      .from(treeTasks)
      .where(and(eq(treeTasks.id, grandParentId), eq(treeTasks.userId, userId)))
      .limit(1)
    grandParent = gpRows[0] ?? null
  }

  const oldRootId = task.rootId
  await rebaseSubtree(userId, task, grandParent)

  if (oldRootId) await recomputeProgress(userId, oldRootId)
  const newRootId = grandParent ? grandParent.rootId : task.id
  if (newRootId && newRootId !== oldRootId) {
    await recomputeProgress(userId, newRootId)
  }
  revalidateAll()
  return { success: true }
}
