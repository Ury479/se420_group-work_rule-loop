import type { Metadata } from "next"
import { getNavOrder } from "@/app/actions/preferences"
import { getEntropyConfig } from "@/app/actions/lifespan"
import { SettingsPanel } from "@/components/settings-panel"
import { EntropySettings } from "@/components/entropy-settings"
import { AccountSettings } from "@/components/account-settings"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "设置" }

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const [navOrder, entropyConfig] = await Promise.all([getNavOrder(), getEntropyConfig()])

  return (
    <main className="w-full px-6 py-8">
      <header>
        <h1 className="font-serif text-3xl tracking-[0.02em] text-balance">设置</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          管理你的账户与个性化设置。
        </p>
      </header>
      <div className="mt-6 flex flex-col gap-6">
        <AccountSettings email={session.user.email} />
        <EntropySettings
          initialBirthDate={entropyConfig.birthDate}
          initialModelTreeUrl={entropyConfig.modelTreeUrl}
        />
        <SettingsPanel initialOrder={navOrder} />
      </div>
    </main>
  )
}
