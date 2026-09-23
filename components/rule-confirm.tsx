"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setRuleActive, updateRuleText } from "@/app/actions/rules"
import { DOMAIN_LABELS, type Domain } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type Rule = {
  id: number
  domain: string
  scenario: string | null
  ruleText: string
  principleText: string | null
  triggerCondition: string | null
  isActive: boolean
}

export function RuleConfirm({ rule }: { rule: Rule }) {
  const router = useRouter()
  const [ruleText, setRuleText] = useState(rule.ruleText)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    if (editing && ruleText.trim() !== rule.ruleText) {
      await updateRuleText(rule.id, ruleText.trim())
    }
    await setRuleActive(rule.id, true)
    router.push("/rules")
  }

  async function handleSkip() {
    setSubmitting(true)
    router.push("/rules")
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">规则内容</CardTitle>
          <Badge variant="secondary">
            {DOMAIN_LABELS[(rule.domain as Domain) ?? "custom"] ?? rule.domain}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-text">编辑规则</Label>
              <Textarea
                id="rule-text"
                value={ruleText}
                onChange={(e) => setRuleText(e.target.value)}
                rows={3}
              />
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
              {ruleText}
            </p>
          )}

          {rule.principleText ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                一句话原则
              </span>
              <p className="text-sm leading-relaxed">{rule.principleText}</p>
            </div>
          ) : null}

          {rule.triggerCondition ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                触发条件
              </span>
              <p className="text-sm leading-relaxed">{rule.triggerCondition}</p>
            </div>
          ) : null}

          {!editing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setEditing(true)}
            >
              修改规则文字
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="h-12"
          disabled={submitting || !ruleText.trim()}
          onClick={handleConfirm}
        >
          确认启用这条规则
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 bg-transparent"
          disabled={submitting}
          onClick={handleSkip}
        >
          暂不启用,稍后再说
        </Button>
      </div>
    </div>
  )
}
