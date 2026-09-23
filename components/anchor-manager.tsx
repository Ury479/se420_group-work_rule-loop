"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { createAnchor, toggleAnchor, deleteAnchor } from "@/app/actions/spending-anchors"
import type { SpendingAnchor } from "@/lib/db/schema"

export function AnchorManager({ anchors }: { anchors: SpendingAnchor[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // 新增记录字段
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [unitLabel, setUnitLabel] = useState("")
  const [purchasedAt, setPurchasedAt] = useState("")
  const [productNote, setProductNote] = useState("")

  const presets = anchors.filter((a) => a.sourceType === "preset")
  const history = anchors.filter((a) => a.sourceType === "history")

  function submit() {
    setError(null)
    const priceNum = Number.parseInt(price, 10)
    if (!name.trim() || !priceNum || priceNum <= 0) {
      setError("请填写名称和大于 0 的金额")
      return
    }
    startTransition(async () => {
      try {
        const res = await createAnchor({
          name: name.trim(),
          priceCny: priceNum,
          unitLabel: unitLabel.trim() || "1 份",
          category: null,
          sourceType: "history",
          purchasedAt: purchasedAt || null,
          productNote: productNote.trim() || null,
        })
        if (res && "error" in res && res.error) {
          setError(res.error)
          return
        }
        setName("")
        setPrice("")
        setUnitLabel("")
        setPurchasedAt("")
        setProductNote("")
        setShowForm(false)
        router.refresh()
      } catch {
        setError("保存失败,请稍后重试")
      }
    })
  }

  function onToggle(id: number, next: boolean) {
    startTransition(async () => {
      await toggleAnchor(id, next)
      router.refresh()
    })
  }

  function onDelete(id: number) {
    startTransition(async () => {
      await deleteAnchor(id)
      router.refresh()
    })
  }

  function AnchorRow({ a }: { a: SpendingAnchor }) {
    return (
      <div
        className={cn(
          "shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3",
          !a.isActive && "opacity-50"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium leading-snug">{a.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            ¥{a.priceCny} / {a.unitLabel}
            {a.purchasedAt && ` · ${a.purchasedAt.toISOString().slice(0, 10)} 付款`}
          </p>
          {a.productNote && <p className="text-xs leading-relaxed text-muted-foreground">{a.productNote}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onToggle(a.id, !a.isActive)}
            aria-label={a.isActive ? "停用换算" : "启用换算"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            {a.isActive ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onDelete(a.id)}
            aria-label="删除"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 新增历史消费 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">历史消费记录</h2>
          <Button size="sm" variant={showForm ? "outline" : "default"} onClick={() => setShowForm(!showForm)}>
            <Plus className="size-4" aria-hidden="true" />
            {showForm ? "收起" : "记一笔"}
          </Button>
        </div>
        {showForm && (
          <div className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="an-name">买了什么 *</Label>
                <Input id="an-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="如:Cursor 会员" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="an-price">花了多少(元)*</Label>
                <Input
                  id="an-price"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="an-unit">对应单位</Label>
                <Input
                  id="an-unit"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="如:1 个月 / 15 张"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="an-date">付款日期</Label>
                <Input id="an-date" type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="an-note">备注(用得怎么样、值不值)</Label>
              <Textarea
                id="an-note"
                value={productNote}
                onChange={(e) => setProductNote(e.target.value)}
                placeholder="如:只用了一周就闲置了 / 每天都在用,很值"
                rows={2}
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <Button size="sm" onClick={submit} disabled={isPending} className="self-start">
              保存记录
            </Button>
          </div>
        )}
        {history.length === 0 && !showForm ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            还没有历史消费记录。点击「记一笔」,记录你真实花过的钱,让未来的换算更贴近你的生活。
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((a) => (
              <AnchorRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      {/* 预设参照物 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">预设参照物</h2>
        <div className="flex flex-col gap-2">
          {presets.map((a) => (
            <AnchorRow key={a.id} a={a} />
          ))}
        </div>
      </section>
    </div>
  )
}
