ALTER TABLE "spend_conversions"
  ALTER COLUMN "actual_amount_minor" SET DATA TYPE bigint,
  ALTER COLUMN "protected_amount_minor" SET DATA TYPE bigint,
  ALTER COLUMN "redirected_amount_minor" SET DATA TYPE bigint,
  ADD COLUMN "outcome_amounts_in_cny" boolean DEFAULT false NOT NULL;
