import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import {
  DOMAIN_LABELS,
  RISK_LABELS,
  STATUS_LABELS,
  type Domain,
  type RiskLevel,
  type ConfirmationStatus,
} from "@/lib/types"
import { cn } from "@/lib/utils"

export function RiskBadge({ risk, className }: { risk: string; className?: string }) {
  const label = RISK_LABELS[risk as RiskLevel] ?? risk
  if (risk === "high") {
    return (
      <Badge
        className={cn(
          "gap-1 bg-destructive text-destructive-foreground",
          className
        )}
      >
        <AlertTriangle className="size-3" aria-hidden="true" />
        {label}
      </Badge>
    )
  }
  if (risk === "medium") {
    return (
      <Badge className={cn("bg-warning text-warning-foreground", className)}>
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  )
}

export function DomainBadge({ domain, className }: { domain: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", className)}>
      {DOMAIN_LABELS[domain as Domain] ?? domain}
    </Badge>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = STATUS_LABELS[status as ConfirmationStatus] ?? status
  const styles: Record<string, string> = {
    pending: "bg-secondary text-secondary-foreground",
    armed: "bg-accent text-accent-foreground",
    checking: "bg-warning text-warning-foreground",
    confirmed: "bg-success text-success-foreground",
    failed: "bg-destructive text-destructive-foreground",
    reviewed: "bg-primary text-primary-foreground",
  }
  return (
    <Badge className={cn(styles[status] ?? "bg-secondary", className)}>{label}</Badge>
  )
}
