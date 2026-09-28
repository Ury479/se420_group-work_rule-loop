import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

// 只在同一次服务端渲染内复用校验,不跨请求或用户缓存会话。
export const getUserId = cache(async (): Promise<string> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
})
