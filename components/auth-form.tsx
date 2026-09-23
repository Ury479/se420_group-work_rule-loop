"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Infinity } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthForm({ mode, nextPath = "/" }: { mode: "sign-in" | "sign-up"; nextPath?: string }) {
  const router = useRouter()
  const isSignUp = mode === "sign-up"
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const alternate = isSignUp ? "/sign-in" : "/sign-up"
  const alternateHref = nextPath === "/" ? alternate : `${alternate}?next=${encodeURIComponent(nextPath)}`

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const email = String(data.get("email") ?? "").trim().toLowerCase()
    const password = String(data.get("password") ?? "")
    const name = String(data.get("name") ?? "").trim()
    if (isSignUp && !name) {
      setError("请输入称呼")
      return
    }
    setPending(true)
    setError("")
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(isSignUp ? "注册未完成，请检查信息或使用其他邮箱。" : "登录失败，请检查邮箱和密码。")
        return
      }
      router.replace(nextPath)
      router.refresh()
    } catch {
      setError("暂时无法连接服务，请稍后再试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-8 font-serif">
      <div className="flex flex-col items-center gap-2 text-center">
        <Infinity className="size-12 stroke-[1.6] text-primary" aria-hidden="true" />
        <span className="font-serif text-2xl font-semibold tracking-wide">RuleLoop</span>
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">Field Notes</span>
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{isSignUp ? "创建账户" : "欢迎回来"}</CardTitle>
          <CardDescription className="leading-relaxed">
            {isSignUp ? "建立你的私人决策记录空间。" : "登录后继续你的记录与复盘。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="auth-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isSignUp ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-name">称呼</Label>
                <Input id="auth-name" name="name" autoComplete="name" required maxLength={80} disabled={pending} />
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-email">邮箱</Label>
              <Input id="auth-email" name="email" type="email" autoComplete="email" required disabled={pending} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-password">密码</Label>
              <Input id="auth-password" name="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} minLength={8} maxLength={128} required disabled={pending} />
              {isSignUp ? <p className="text-xs text-muted-foreground">至少 8 位字符</p> : null}
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending} className="w-full">{pending ? "请稍候…" : isSignUp ? "创建账户" : "登录"}</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>{isSignUp ? "已有账户？" : "还没有账户？"}</span>
          <Link href={alternateHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {isSignUp ? "去登录" : "注册账户"}
          </Link>
        </CardFooter>
      </Card>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">每条记录只属于你自己的账户。</p>
    </div>
  )
}
