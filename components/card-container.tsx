"use client"

// Card Container:统一卡片流容器。
// 所有卡片类型共用 CardItem,通过类型配置区分;新增类型无需改此文件。

import { useState, useTransition } from "react"
import type { UnifiedCard } from "@/lib/db/schema"
import { CARD_TYPE_CONFIGS, getCardTypeConfig, type CardTypeKey } from "@/lib/card-types"
import { createCard, updateCard, deleteCard, duplicateCard, reorderCards } from "@/app/actions/cards"
import { CardItem } from "@/components/card-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"

interface CardContainerProps {
  contextType: string
  contextId: number
  initialCards: UnifiedCard[]
}

export function CardContainer({ contextType, contextId, initialCards }: CardContainerProps) {
  const [cards, setCards] = useState<UnifiedCard[]>(initialCards)
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState<CardTypeKey>("decision")
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [linkTo, setLinkTo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<number | null>(null)

  const typeConfig = getCardTypeConfig(newType)

  function resetForm() {
    setNewTitle("")
    setNewContent("")
    setLinkTo(null)
    setError(null)
  }

  // 新增卡片:仅追加 Card Item,不刷新页面
  function handleCreate(keepOpen: boolean) {
    if (!newTitle.trim()) {
      setError("卡片标题不能为空")
      return
    }
    startTransition(async () => {
      const result = await createCard({
        cardType: newType,
        title: newTitle.trim(),
        content: newContent.trim() || null,
        priority: "normal",
        contextType,
        contextId,
        linkedCardId: linkTo,
      })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setCards((prev) => [...prev, result])
      resetForm()
      // 持续追加:保存后立即可以创建下一张卡片
      if (!keepOpen) setAdding(false)
    })
  }

  function handleUpdate(id: number, patch: Parameters<typeof updateCard>[1]) {
    startTransition(async () => {
      const result = await updateCard(id, patch)
      if ("error" in result) return
      setCards((prev) => prev.map((c) => (c.id === id ? result : c)))
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteCard(id)
      if ("error" in result) return
      setCards((prev) =>
        prev.filter((c) => c.id !== id).map((c) => (c.linkedCardId === id ? { ...c, linkedCardId: null } : c)),
      )
    })
  }

  function handleDuplicate(id: number) {
    startTransition(async () => {
      const result = await duplicateCard(id)
      if ("error" in result) return
      setCards((prev) => {
        const index = prev.findIndex((c) => c.id === id)
        const next = [...prev]
        next.splice(index + 1, 0, result)
        return next
      })
    })
  }

  function persistOrder(next: UnifiedCard[]) {
    setCards(next)
    startTransition(async () => {
      await reorderCards(
        contextType,
        contextId,
        next.map((c) => c.id),
      )
    })
  }

  function handleMove(id: number, direction: -1 | 1) {
    const index = cards.findIndex((c) => c.id === id)
    const target = index + direction
    if (target < 0 || target >= cards.length) return
    const next = [...cards]
    ;[next[index], next[target]] = [next[target], next[index]]
    persistOrder(next)
  }

  // HTML5 拖拽排序
  function handleDrop(overId: number) {
    if (dragId === null || dragId === overId) return
    const from = cards.findIndex((c) => c.id === dragId)
    const to = cards.findIndex((c) => c.id === overId)
    if (from < 0 || to < 0) return
    const next = [...cards]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    persistOrder(next)
    setDragId(null)
  }

  return (
    <section aria-label="卡片流" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          卡片流 · {cards.length}
        </h2>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" aria-hidden="true" />
            新增卡片
          </Button>
        )}
      </div>

      {cards.length === 0 && !adding && (
        <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground text-pretty">
          还没有卡片。把边界、决策、风险、执行、复盘都写成卡片,持续追加,形成完整的决策链路。
        </p>
      )}

      <ul className="flex flex-col gap-2" role="list">
        {cards.map((card, index) => (
          <li
            key={card.id}
            draggable
            onDragStart={() => setDragId(card.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(card.id)}
            className={dragId === card.id ? "opacity-50" : undefined}
          >
            <CardItem
              card={card}
              allCards={cards}
              isFirst={index === 0}
              isLast={index === cards.length - 1}
              pending={pending}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMove={handleMove}
            />
          </li>
        ))}
      </ul>

      {adding && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="卡片类型">
            {CARD_TYPE_CONFIGS.map((cfg) => (
              <button
                key={cfg.key}
                type="button"
                role="radio"
                aria-checked={newType === cfg.key}
                onClick={() => setNewType(cfg.key)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  newType === cfg.key
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="卡片标题"
            aria-label="卡片标题"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                handleCreate(true)
              }
            }}
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={typeConfig.placeholder}
            aria-label="卡片内容"
            rows={3}
          />

          {cards.length > 0 && (
            <div className="flex flex-col gap-1">
              <label htmlFor="card-link" className="text-xs text-muted-foreground">
                关联上游卡片(形成决策链路,选填)
              </label>
              <select
                id="card-link"
                value={linkTo ?? ""}
                onChange={(e) => setLinkTo(e.target.value ? Number(e.target.value) : null)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">不关联</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCardTypeConfig(c.cardType).label} · {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => handleCreate(true)} disabled={pending}>
              {pending ? "保存中…" : "保存并继续追加"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleCreate(false)} disabled={pending}>
              保存并收起
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                resetForm()
                setAdding(false)
              }}
            >
              取消
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
