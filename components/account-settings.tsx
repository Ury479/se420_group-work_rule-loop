"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AccountSettings({ email }: { email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function signOut() {
    setPending(true)
    setError("")
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError("退出失败，请稍后重试。")
        return
      }
      router.replace("/sign-in")
      router.refresh()
    } catch {
      setError("退出失败，请稍后重试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>账户</CardTitle>
        <CardDescription>当前登录身份与会话管理</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">登录邮箱：<span className="text-foreground">{email}</span></p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <Button variant="outline" onClick={signOut} disabled={pending}>{pending ? "正在退出…" : "退出登录"}</Button>
      </CardContent>
    </Card>
  )
}
