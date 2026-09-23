"use client"

// Card Item:统一卡片组件。所有类型共用,仅通过类型配置区分外观与提示。

import { useState } from "react"
import type { UnifiedCard } from "@/lib/db/schema"
import { getCardTypeConfig } from "@/lib/card-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUp, ArrowDown, Copy, Pencil, Trash2, Link2, GripVertical } from "lucide-react"

interface CardItemProps {
  card: UnifiedCard
  allCards: UnifiedCard[]
  isFirst: boolean
  isLast: boolean
  pending: boolean
  onUpdate: (id: number, patch: { title?: string; content?: string; status?: "active" | "done" | "archived" }) => void
  onDelete: (id: number) => void
  onDuplicate: (id: number) => void
  onMove: (id: number, direction: -1 | 1) => void
}

export function CardItem({
  card,
  allCards,
  isFirst,
  isLast,
  pending,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
}: CardItemProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [content, setContent] = useState(card.content ?? "")

  const cfg = getCardTypeConfig(card.cardType)
  const linked = card.linkedCardId ? allCards.find((c) => c.id === card.linkedCardId) : null
  const isDone = card.status === "done"

  function saveEdit() {
    if (!title.trim()) return
    onUpdate(card.id, { title: title.trim(), content: content.trim() })
    setEditing(false)
  }

  return (
    <div className="group/card flex overflow-hidden rounded-lg border bg-card">
      <div className={`w-1 shrink-0 ${cfg.accentClass}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <GripVertical
            className="mt-1 size-3.5 shrink-0 cursor-grab text-muted-foreground/50"
            aria-hidden="true"
          />
          <Checkbox
            checked={isDone}
            onCheckedChange={(v) => onUpdate(card.id, { status: v ? "done" : "active" })}
            aria-label={`完成 ${card.title}`}
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badgeClass}`}>
                {cfg.label}
              </span>
              {linked && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Link2 className="size-3" aria-hidden="true" />
                  {getCardTypeConfig(linked.cardType).label} · {linked.title}
                </span>
              )}
            </div>

            {editing ? (
              <div className="flex flex-col gap-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="编辑卡片标题" />
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={cfg.placeholder}
                  aria-label="编辑卡片内容"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={pending}>
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTitle(card.title)
                      setContent(card.content ?? "")
                      setEditing(false)
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-sm font-medium text-pretty ${isDone ? "text-muted-foreground line-through" : ""}`}>
                  {card.title}
                </p>
                {card.content && (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground text-pretty">
                    {card.content}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/card:opacity-100">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={`编辑 ${card.title}`}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onDuplicate(card.id)}
              disabled={pending}
              aria-label={`复制 ${card.title}`}
            >
              <Copy className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onMove(card.id, -1)}
              disabled={isFirst || pending}
              aria-label="上移"
            >
              <ArrowUp className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onMove(card.id, 1)}
              disabled={isLast || pending}
              aria-label="下移"
            >
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm("确定删除这张卡片吗?")) onDelete(card.id)
              }}
              disabled={pending}
              aria-label={`删除 ${card.title}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
