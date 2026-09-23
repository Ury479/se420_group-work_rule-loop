import type { Metadata } from "next"
import { AuthForm } from "@/components/auth-form"

export const metadata: Metadata = { title: "注册" }

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/sign-") ? next : "/"
  return <AuthForm mode="sign-up" nextPath={nextPath} />
}
