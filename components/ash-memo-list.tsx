"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAshMemo } from "@/app/actions/intercept"
import { saveStructuredLesson } from "@/app/actions/experience-trigger"
import type { AshMemo } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Flame, Loader2, NotebookPen, ShieldCheck, FilePlus2 } from "lucide-react"

/**
 * 拦截规则独立笔记卡片:点击弹出详情。
 */
function RuleNoteCard({ memo }: { memo: AshMemo }) {
  if (!memo.interceptionRule) return null
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm leading-relaxed transition-colors hover:bg-primary/10"
          />
        }
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-primary">拦截规则笔记</span>
          <span className="line-clamp-2">{memo.interceptionRule}</span>
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>拦截规则笔记</DialogTitle>
          <DialogDescription>
            这条规则已写入规则库并启用,下次类似场景自动命中。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 leading-relaxed">
            {memo.interceptionRule}
          </p>
          {memo.principle ? (
            <p className="leading-relaxed">
              <span className="font-medium">来源原则:</span>
              {memo.principle}
            </p>
          ) : null}
          {memo.lesson ? (
            <p className="leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">背后教训:</span>
              {memo.lesson}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 事后补充弹窗:全部字段可选,只更新填写的部分。
 */
function SupplementDialog({ memo }: { memo: AshMemo }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const val = (k: string) => {
      const v = String(form.get(k) ?? "").trim()
      return v || undefined
    }
    const result = await updateAshMemo({
      id: memo.id,
      title: val("title"),
      whatHappened: val("whatHappened"),
      cost: val("cost"),
      lesson: val("lesson"),
      principle: val("principle"),
      interceptionRule: val("interceptionRule"),
    })
    const structured = val("pastChoice") && val("actualCost") && val("alternativeChoice") && val("lessonStatement") ? await saveStructuredLesson({ sourceType: "ash_memo", sourceId: memo.id, pastChoice: val("pastChoice"), actualCost: val("actualCost"), alternativeChoice: val("alternativeChoice"), lessonStatement: val("lessonStatement"), lessonStatus: String(form.get("lessonStatus") ?? "draft") }) : null
    setSaving(false)
    if (structured && "error" in structured && structured.error) { setError(structured.error); return }
    if (result && "error" in result && result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="text-muted-foreground" />
        }
      >
        <FilePlus2 className="size-4" aria-hidden="true" />
        补充
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>事后补充</DialogTitle>
          <DialogDescription>
            只填想补的内容即可,其余留空不会被覆盖。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-title-${memo.id}`}>标题</Label>
            <Input
              id={`s-title-${memo.id}`}
              name="title"
              maxLength={200}
              defaultValue={memo.title ?? ""}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-lesson-${memo.id}`}>教训</Label>
            <Textarea
              id={`s-lesson-${memo.id}`}
              name="lesson"
              maxLength={1000}
              rows={2}
              defaultValue={memo.lesson ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-principle-${memo.id}`}>原则</Label>
            <Textarea
              id={`s-principle-${memo.id}`}
              name="principle"
              maxLength={500}
              rows={2}
              defaultValue={memo.principle ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-rule-${memo.id}`}>拦截规则</Label>
            <Textarea
              id={`s-rule-${memo.id}`}
              name="interceptionRule"
              maxLength={500}
              rows={2}
              defaultValue={memo.interceptionRule ?? ""}
              placeholder="补上后会自动写入规则库并启用"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-what-${memo.id}`}>这次发生了什么</Label>
            <Textarea
              id={`s-what-${memo.id}`}
              name="whatHappened"
              maxLength={2000}
              rows={2}
              defaultValue={memo.whatHappened ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`s-cost-${memo.id}`}>代价</Label>
            <Input
              id={`s-cost-${memo.id}`}
              name="cost"
              maxLength={500}
              defaultValue={memo.cost ?? ""}
              className="h-10"
            />
          </div>
          <div className="rounded-lg border bg-muted/30 p-3"><p className="mb-3 text-sm font-medium">结构化教训（四项完整后保存）</p><div className="flex flex-col gap-3"><Textarea name="pastChoice" placeholder="过去我做了什么选择？" defaultValue={memo.pastChoice??""}/><Textarea name="actualCost" placeholder="实际付出了什么代价？" defaultValue={memo.actualCost??""}/><Textarea name="alternativeChoice" placeholder="当时更好的不同选择是什么？" defaultValue={memo.alternativeChoice??""}/><Textarea name="lessonStatement" placeholder="这次沉淀出的教训是什么？" defaultValue={memo.lessonStatement??""}/><select name="lessonStatus" defaultValue={memo.lessonStatus} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="draft">草稿</option><option value="confirmed">由我确认</option><option value="superseded">已被替代</option><option value="archived">归档</option></select></div></div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <NotebookPen className="size-4" aria-hidden="true" />
            )}
            保存补充
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function AshMemoList({ memos }: { memos: AshMemo[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {memos.map((memo) => (
        <li key={memo.id}>
          <Card className="py-5">
            <CardContent className="flex flex-col gap-3 px-5">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-destructive" aria-hidden="true" />
                <h2 className="flex-1 font-semibold text-pretty">
                  {memo.title || "灰烬备忘录"}
                </h2>
                {!memo.interceptionRule ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    待补充
                  </Badge>
                ) : null}
                <SupplementDialog memo={memo} />
              </div>
              {memo.whatHappened ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {memo.whatHappened}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 text-sm">
                {memo.lesson ? (
                  <p className="rounded-lg bg-secondary px-3 py-2 leading-relaxed">
                    <span className="font-medium">教训:</span>
                    {memo.lesson}
                  </p>
                ) : null}
                {memo.principle ? (
                  <p className="rounded-lg bg-secondary px-3 py-2 leading-relaxed">
                    <span className="font-medium">原则:</span>
                    {memo.principle}
                  </p>
                ) : null}
                <RuleNoteCard memo={memo} />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
