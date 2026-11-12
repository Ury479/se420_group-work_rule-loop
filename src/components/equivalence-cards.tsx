"use client";

import Link from "next/link";
import { Scale, History } from "lucide-react";
import { useTranslator } from "@/components/page-translator";
import { formatCatalogName, formatCatalogUnit } from "@/lib/convert-domain";
import { cn } from "@/lib/utils";
import type { SpendingAnchor } from "@/db/schema";

// 把一笔金额换算成 "N 个参照物" 的表达
function formatEquivalent(
  ratio: number,
  unitLabel: string,
  lang: "zh" | "en",
): string {
  if (ratio >= 1) {
    // 整数优先,否则保留 1 位小数
    const n = ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10;
    return `${n} × ${formatCatalogUnit(unitLabel, lang, n !== 1)}`;
  }
  const pct = Math.round(ratio * 100);
  return `${pct}% × ${formatCatalogUnit(unitLabel, lang)}`;
}

export function EquivalenceCards({
  amountCny,
  anchors,
  className,
}: {
  amountCny: number;
  anchors: SpendingAnchor[];
  className?: string;
}) {
  const { lang } = useTranslator();
  if (amountCny <= 0 || anchors.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-secondary/40 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Scale className="size-3.5" aria-hidden="true" />
          {`这 ${amountCny} 元等价于什么?`}
        </p>
        <Link
          href="/spending-review/anchors"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <History className="size-3" aria-hidden="true" />
          管理参照物
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {anchors.map((a) => {
          const ratio = amountCny / a.priceCny;
          const highlight = ratio >= 1;
          const catalogLang = a.sourceType === "preset" ? lang : "zh";
          return (
            <div
              key={a.id}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg border px-2.5 py-2",
                highlight
                  ? "border-foreground/20 bg-card"
                  : "border-border bg-card/60",
              )}
            >
              <span className="truncate text-xs text-muted-foreground">
                <span data-no-translate>{formatCatalogName(a.name, catalogLang)}</span>
                {a.sourceType === "history" && (
                  <span data-no-translate className="ml-1 rounded-full bg-muted px-1 py-px text-[10px]">
                    {lang === "en" ? "History" : "史"}
                  </span>
                )}
              </span>
              <span
                data-no-translate
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  highlight ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {formatEquivalent(ratio, a.unitLabel, catalogLang)}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                单价{" "}
                <span data-no-translate>
                  ¥{a.priceCny} / {formatCatalogUnit(a.unitLabel, catalogLang)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        换算的目的:把这笔钱放回你真实的价值坐标系,再问一遍——它值吗?
      </p>
    </div>
  );
}
