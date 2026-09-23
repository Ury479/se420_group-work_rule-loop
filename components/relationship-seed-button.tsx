"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { initializeThaiJuniorRelationship } from "@/app/actions/relationship-stage"
import { Button } from "@/components/ui/button"

export function RelationshipSeedButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  return <div className="flex flex-col items-start gap-2"><Button variant="outline" disabled={pending} onClick={()=>startTransition(async()=>{setError("");const result=await initializeThaiJuniorRelationship();if("error" in result)setError(result.error||"初始化失败");else{router.push(`/relationships/${result.id}`);router.refresh()}})}>{pending?"创建中…":"创建泰语系学妹初始记录"}</Button>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<p className="text-xs text-muted-foreground">仅明确背景写为事实，其余内容全部标为待验证，不创建虚构互动。</p></div>
}
