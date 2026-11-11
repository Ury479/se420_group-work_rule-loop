import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { currentAccountId } from "@/db";

export async function getUserId(): Promise<string> {
  const current = currentAccountId();
  if (current) return current;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user.id;
}
