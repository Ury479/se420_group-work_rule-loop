import { BoundaryForm } from "@/components/boundary-form"

export default function NewBoundaryPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">新建安全边界</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          局部正确,不等于现在应该深做。先回答三个问题,再决定投入。
        </p>
      </section>
      <BoundaryForm />
    </div>
  )
}
