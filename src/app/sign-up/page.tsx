import { safeReturnPath } from "@/lib/return-path";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "注册" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeReturnPath(next);
  return <AuthForm mode="sign-up" nextPath={nextPath} />;
}
