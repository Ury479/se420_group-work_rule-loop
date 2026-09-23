"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { armConfirmation } from "@/app/actions/intercept"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DOMAIN_LABELS,
  FINAL_ACTION_LABELS,
  type Domain,
  type FinalActionType,
} from "@/lib/types"
import { BACKUP_PATH_LIBRARY } from "@/lib/templates"
import { ChevronDown, Loader2, ShieldPlus } from "lucide-react"

export function ArmForm() {
  const router = useRouter()
  const [domain, setDomain] = useState<Domain>("study")
  const [finalActionType, setFinalActionType] =
    useState<FinalActionType>("submit")
  const [showOptional, setShowOptional] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchedRules, setMatchedRules] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    try {
      const result = await armConfirmation({
        title: String(form.get("title") ?? ""),
        costIfFailed: String(form.get("costIfFailed") ?? ""),
        likelyMistake: String(form.get("likelyMistake") ?? ""),
        deadline: String(form.get("deadline") ?? "") || null,
        locationOrPlatform: String(form.get("locationOrPlatform") ?? "") || null,
        backupPath: String(form.get("backupPath") ?? "") || null,
        domain,
        finalActionType,
      })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      if ("id" in result) {
        if (result.matchedRules && result.matchedRules.length > 0) {
          setMatchedRules(result.matchedRules)
          // 短暂展示命中规则后跳转首页
          setTimeout(() => router.push("/"), 2500)
        } else {
          router.push("/")
        }
      }
    } catch {
      // 服务端异常(如数据库不可用)时明确提示,避免数据静默丢失
      setError("保存失败:服务器或数据库暂时不可用,请稍后重试。你填写的内容仍在表单中,未丢失。")
    } finally {
      setSubmitting(false)
    }
  }

  if (matchedRules.length > 0) {
    return (
      <Card className="border-primary py-5">
        <CardContent className="flex flex-col gap-3 px-5">
          <p className="text-sm font-semibold">
            已布防。根据历史教训,本次已自动加入以下拦截规则:
          </p>
          <ul className="flex flex-col gap-2">
            {matchedRules.map((rule) => (
              <li
                key={rule}
                className="rounded-lg bg-secondary px-3 py-2 text-sm leading-relaxed"
              >
                {rule}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">正在返回首页&hellip;</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">1. 我要做什么? *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="例如:提交 SE 作业"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="costIfFailed">2. 错了代价是什么? *</Label>
            <Input
              id="costIfFailed"
              name="costIfFailed"
              required
              maxLength={500}
              placeholder="例如:扣分,影响课程成绩"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="likelyMistake">3. 最容易错在哪里? *</Label>
            <Input
              id="likelyMistake"
              name="likelyMistake"
              required
              maxLength={500}
              placeholder="例如:提交错文件、没看清老师要求"
              className="h-11"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>场景</Label>
              <Select
                items={DOMAIN_LABELS}
                value={domain}
                onValueChange={(v) => setDomain(v as Domain)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOMAIN_LABELS) as Domain[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {DOMAIN_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>最终动作</Label>
              <Select
                items={FINAL_ACTION_LABELS}
                value={finalActionType}
                onValueChange={(v) => setFinalActionType(v as FinalActionType)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FINAL_ACTION_LABELS) as FinalActionType[]).map(
                    (a) => (
                      <SelectItem key={a} value={a}>
                        {FINAL_ACTION_LABELS[a]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        aria-expanded={showOptional}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showOptional ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        {showOptional ? "收起可选信息" : "补充可选信息(最多 3 项)"}
      </button>

      {showOptional && (
        <Card className="py-5">
          <CardContent className="flex flex-col gap-5 px-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="deadline">截止时间 / 执行时间</Label>
                <Input
                  id="deadline"
                  name="deadline"
                  type="datetime-local"
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="locationOrPlatform">地点 / 平台 / 对象</Label>
                <Input
                  id="locationOrPlatform"
                  name="locationOrPlatform"
                  maxLength={300}
                  placeholder="例如:Moodle / 王老师 / 机场 T2"
                  className="h-11"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="backupPath">备用方案 / 备用路径</Label>
              <Textarea
                id="backupPath"
                name="backupPath"
                maxLength={1000}
                rows={3}
                placeholder={BACKUP_PATH_LIBRARY[domain].join(";")}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                找不到入口、不确定信息时的替代路径。参考:
                {BACKUP_PATH_LIBRARY[domain].slice(0, 3).join(" / ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="h-12 text-base"
      >
        {submitting ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <ShieldPlus className="size-5" aria-hidden="true" />
        )}
        完成布防
      </Button>
    </form>
  )
}
