"use client";

import { useTranslator } from "@/components/page-translator";
import {
  formatCatalogName,
  formatCny,
  formatQuantity,
  formatRemainder,
  type ConversionSnapshot,
} from "@/lib/convert-domain";

export function ConversionPreview({
  headingId,
  preview,
}: {
  headingId: string;
  preview: ConversionSnapshot;
}) {
  const { lang } = useTranslator();
  return (
    <section
      aria-labelledby={headingId}
      className="mt-3 border-t border-border pt-3"
    >
      <h2 id={headingId} className="text-sm font-semibold">
        本次换算预览
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        同一笔金额分别换算，预览不会保存记录。
      </p>
      {preview.input.currency === "USD" ? (
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
          折合人民币 {formatCny(preview.input.cnyAmountMinor)}
        </p>
      ) : null}
      <ol
        className="mt-3 grid gap-2 min-[360px]:grid-cols-2"
        aria-live="polite"
      >
        {preview.items.map((item) => (
          <li
            key={item.catalogItemId}
            className="min-w-0 rounded-lg border border-border bg-secondary/30 p-2.5 sm:p-3"
          >
            <h3 data-no-translate className="text-sm font-medium break-words">
              {formatCatalogName(item.name, lang)}
            </h3>
            <p
              data-no-translate
              className="mt-1 font-mono text-sm font-semibold break-words tabular-nums sm:text-base"
            >
              {formatRemainder(item, lang) || formatQuantity(item, lang)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
