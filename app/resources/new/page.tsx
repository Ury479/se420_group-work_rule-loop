import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ResourceForm } from "@/components/resource-form"

export const metadata = { title: "登记资源" }

export default function NewResourcePage() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/resources"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回资源配置台
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">登记资源</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          登记不等于激活。资源默认进入「待复审」,补齐激活三要素后才能激活。
        </p>
      </header>
      <ResourceForm />
    </div>
  )
}
