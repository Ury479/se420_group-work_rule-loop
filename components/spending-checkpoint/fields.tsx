import type { ReactNode, SelectHTMLAttributes } from "react"
import { Label } from "@/components/ui/label"

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-2"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>}</div>
}

export function ReviewSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50" />
}
