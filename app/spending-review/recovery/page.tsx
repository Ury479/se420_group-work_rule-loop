import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getRecoveryActions } from "@/app/actions/spending-review"
import { RecoveryActionsPanel } from "@/components/recovery-actions-panel"

export default async function RecoveryPage() {
  const actions = await getRecoveryActions()

  return (
    <main className="flex flex-col gap-5">
      <Link
        href="/spending-review"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回决策拦截台
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance">主线回归</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          决策被拦截后,不停在「不买」,而是马上回到主线做一个最小动作。
        </p>
      </header>
      <RecoveryActionsPanel actions={actions} />
    </main>
  )
}
