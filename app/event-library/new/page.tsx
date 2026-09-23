import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EventQuickRecordForm } from "@/components/event-quick-record-form"
import { TranslateToggle } from "@/components/page-translator"

export default function NewEventPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link
          href="/event-library"
          aria-label="返回事件库"
          className="hud-tile flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-balance">记录事件</h1>
          <p className="text-xs text-muted-foreground">先记录,再去解决现实问题,复盘可以稍后做</p>
        </div>
        <TranslateToggle />
      </header>
      <EventQuickRecordForm />
    </div>
  )
}
