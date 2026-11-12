"use client";

import { useTranslator } from "@/components/page-translator";
import {
  BILLING_TYPE_LABEL,
  CURRENCY_SYMBOL,
  formatCatalogName,
  formatCatalogUnit,
  formatMinor,
  formatQuantity,
  formatRemainder,
  quantityAriaLabel,
  type SnapshotItem,
} from "@/lib/convert-domain";

const RANK_STYLES: Record<number, string> = {
  1: "border-warning/60 bg-warning/15 text-warning",
  2: "border-primary/60 bg-primary/15 text-primary",
  3: "border-info/60 bg-info/15 text-info",
};

export function ConversionEquivalentRow({
  item,
  highlight = false,
  rank,
}: {
  item: SnapshotItem;
  highlight?: boolean;
  rank?: number;
}) {
  const { lang } = useTranslator();
  const remainder = formatRemainder(item, lang);
  return (
    <li
      className={
        highlight
          ? "shadow-card flex flex-col gap-1 rounded-xl border bg-card px-4 py-3"
          : "flex flex-col gap-1 rounded-lg border bg-card/70 px-3 py-2"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {rank && rank <= 3 ? (
            <span
              data-no-translate
              aria-label={lang === "en" ? `Rank ${rank}` : `第 ${rank} 名`}
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${RANK_STYLES[rank]}`}
            >
              {rank}
            </span>
          ) : null}
          <span
            data-no-translate
            className="min-w-0 truncate text-sm font-medium"
          >
            {formatCatalogName(item.name, lang)}
          </span>
        </span>
        <span
          className={
            highlight
              ? "font-mono text-xl font-semibold tabular-nums"
              : "font-mono text-base tabular-nums"
          }
          data-no-translate
          aria-label={quantityAriaLabel(item, lang)}
        >
          {formatQuantity(item, lang)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
          {BILLING_TYPE_LABEL[item.billingType]}
        </span>
        <span className="font-mono tabular-nums">
          单价 {CURRENCY_SYMBOL[item.currency]}
          {formatMinor(item.priceMinor)}
          {item.maxPriceMinor !== null
            ? `–${formatMinor(item.maxPriceMinor)}`
            : ""}{" "}
          /{" "}
          <span data-no-translate>
            {formatCatalogUnit(item.unitLabel, lang)}
          </span>
        </span>
        {remainder ? (
          <span data-no-translate className="font-mono tabular-nums">
            {remainder}
          </span>
        ) : null}
      </div>
    </li>
  );
}
