"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  translateText,
  saveTranslation,
  deleteTranslation,
} from "@/app/actions/translate"
import {
  USAGE_SCENE_LABELS,
  TONE_LABELS,
  type UsageScene,
  type Tone,
} from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type HistoryItem = {
  id: number
  sourceText: string
  translatedText: string
  usageScene: string
  tone: string
  createdAt: string
}

export function TranslateTool({ history }: { history: HistoryItem[] }) {
  const router = useRouter()
  const [sourceText, setSourceText] = useState("")
  const [usageScene, setUsageScene] = useState<UsageScene>("requirement")
  const [tone, setTone] = useState<Tone>("formal")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleTranslate() {
    if (!sourceText.trim()) {
      setError("请输入中文内容")
      return
    }
    setError(null)
    setSaved(false)
    setLoading(true)
    const res = await translateText({
      sourceText: sourceText.trim(),
      usageScene,
      tone,
    })
    setLoading(false)
    if ("error" in res && res.error) {
      setError(res.error)
      return
    }
    if ("translatedText" in res && res.translatedText) {
      setResult(res.translatedText)
    }
  }

  async function handleSave() {
    if (!result.trim()) return
    setSaving(true)
    const res = await saveTranslation({
      sourceText: sourceText.trim(),
      usageScene,
      tone,
      translatedText: result,
    })
    setSaving(false)
    if (res && "success" in res && res.success) {
      setSaved(true)
      router.refresh()
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(id: number) {
    await deleteTranslation(id)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">输入中文</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="粘贴需要翻译的中文内容,例如功能需求、作业说明、消息草稿或复盘规则……"
            rows={5}
            aria-label="中文原文"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>使用场景</Label>
              <Select
                items={USAGE_SCENE_LABELS}
                value={usageScene}
                onValueChange={(v) => setUsageScene(v as UsageScene)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(USAGE_SCENE_LABELS) as UsageScene[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {USAGE_SCENE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>语气</Label>
              <Select
                items={TONE_LABELS}
                value={tone}
                onValueChange={(v) => setTone(v as Tone)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TONE_LABELS) as Tone[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TONE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            size="lg"
            className="h-12"
            onClick={handleTranslate}
            disabled={loading}
          >
            {loading ? "翻译中..." : "翻译成英文"}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">英文结果(可编辑)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              rows={5}
              aria-label="英文译文"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-transparent" onClick={handleCopy}>
                {copied ? "已复制" : "复制英文"}
              </Button>
              <Button onClick={handleSave} disabled={saving || saved}>
                {saved ? "已保存" : saving ? "保存中..." : "保存记录"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {history.length > 0 ? (
        <section aria-label="翻译历史" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            最近记录
          </h2>
          <ul className="flex flex-col gap-3">
            {history.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {item.sourceText}
                    </p>
                    <p className="text-sm font-medium leading-relaxed">
                      {item.translatedText}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {USAGE_SCENE_LABELS[item.usageScene as UsageScene] ??
                            item.usageScene}
                        </Badge>
                        <Badge variant="outline">
                          {TONE_LABELS[item.tone as Tone] ?? item.tone}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => handleDelete(item.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
