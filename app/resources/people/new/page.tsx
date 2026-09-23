import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PersonForm } from "@/components/person-form"

export const metadata = { title: "登记联系人" }

export default function NewPersonPage() {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/resources/people"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回人脉资源
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">登记联系人</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          先明确对方能提供什么、我能回馈什么。对方诉求以「假设」形式记录,不写成事实。
        </p>
      </header>
      <PersonForm />
    </div>
  )
}
