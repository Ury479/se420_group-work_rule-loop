import type { Metadata } from "next"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = { title: "登录" }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/sign-") ? next : "/"
  return <AuthForm mode="sign-in" nextPath={nextPath} />
}
