import { cn } from "@/lib/utils";
import {
  riskLevelLabel,
  decisionStatusLabel,
} from "@/lib/spending-review-types";

const riskTone: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const statusTone: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  cooling: "bg-warning/15 text-warning",
  cooling_ready: "bg-warning/15 text-warning",
  awaiting_gpt: "bg-accent text-accent-foreground",
  awaiting_ai: "bg-accent text-accent-foreground",
  ai_queued: "bg-accent text-accent-foreground",
  ai_running: "bg-accent text-accent-foreground",
  ai_failed: "bg-destructive/10 text-destructive",
  awaiting_final: "bg-success/12 text-success",
  cancelled: "bg-muted text-muted-foreground",
  delayed: "bg-warning/15 text-warning",
  reduced: "bg-muted text-muted-foreground",
  confirmed: "bg-secondary text-secondary-foreground",
  paid: "bg-foreground text-background",
};

export function RiskBadge({
  level,
  className,
}: {
  level: string | null;
  className?: string;
}) {
  if (!level) return null;
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium",
        riskTone[level] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {riskLevelLabel(level)}
    </span>
  );
}

export function DecisionStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        statusTone[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {decisionStatusLabel(status)}
    </span>
  );
}
