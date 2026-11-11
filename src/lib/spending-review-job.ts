import type { z } from "zod";
import type { suggestionSchema } from "./hermes-spending-review.mjs";

export type SpendingReviewJobStatus =
  | "queued"
  | "running"
  | "failed"
  | "succeeded";
export type SpendingReviewJobError =
  | "unavailable"
  | "timeout"
  | "invalid_result"
  | "interrupted";
export type SpendingReviewSuggestion = z.infer<typeof suggestionSchema> & {
  alternativesFromInput?: true;
};

export type SpendingReviewPayload = {
  language: "zh" | "en";
  spending: {
    title: string;
    amount: number;
    currency: string;
    category: string;
    subscription: boolean;
    billingCycle: string | null;
    autoRenew: boolean;
    refundable: boolean | null;
    reversible: boolean | null;
  };
  ruleAssessment: {
    riskLevel: string | null;
    triggers: string[];
    recommendation: string | null;
    fundingSource: string;
    monthlyBudgetRemainingCny: number | null;
  };
  context: {
    purpose: string | null;
    need: string | null;
    consequenceOfSkipping: string | null;
    alternative: string | null;
    sevenDayUseCase: string | null;
  };
};

export function spendingReviewStage(
  decisionStatus: string,
  jobStatus: SpendingReviewJobStatus | null | undefined,
) {
  if (decisionStatus !== "awaiting_ai") return decisionStatus;
  switch (jobStatus) {
    case "queued":
      return "ai_queued";
    case "running":
      return "ai_running";
    case "succeeded":
      return "awaiting_final";
    default:
      return "ai_failed";
  }
}
