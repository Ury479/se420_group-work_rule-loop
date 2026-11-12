"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Calculator } from "lucide-react";
import { ConversionPreview } from "@/components/conversion-preview";
import { HudPanel } from "@/components/hud";
import { useTranslator } from "@/components/page-translator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_SPEND_CONVERSION_MINOR,
  buildComparisonPreview,
  formatCatalogName,
  parseAmountToMinor,
  type CatalogInput,
  type SpendInputCurrency,
} from "@/lib/convert-domain";

export function HomeMoneyPreview({
  items,
  usdToCnyRate,
  defaultsUnavailable,
  children,
}: {
  items: CatalogInput[];
  usdToCnyRate: string;
  defaultsUnavailable: boolean;
  children?: ReactNode;
}) {
  const { lang } = useTranslator();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<SpendInputCurrency>("CNY");
  const [error, setError] = useState<string | null>(null);
  const parsed = parseAmountToMinor(amount, MAX_SPEND_CONVERSION_MINOR);
  const preview = parsed.ok
    ? buildComparisonPreview({
        inputCurrency: currency,
        amountMinor: parsed.minor,
        usdToCnyRate,
        items,
      })
    : null;

  return (
    <HudPanel aria-labelledby="home-money-title" className="min-w-0 p-4 sm:p-5">
      <h2
        id="home-money-title"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <Calculator className="size-5 text-primary" aria-hidden="true" />
        金额换算
      </h2>
      <form
        action="/convert"
        method="get"
        onSubmit={(event) => {
          if (amount.trim() && !parsed.ok) {
            event.preventDefault();
            setError(parsed.message);
          }
        }}
        className="mt-4"
      >
        <Label htmlFor="home-conversion-amount">计划金额</Label>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Input
            id="home-conversion-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(null);
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? "home-conversion-error" : undefined}
            className="min-h-11 min-w-28 flex-1 font-mono tabular-nums"
          />
          <select
            id="home-conversion-currency"
            name="currency"
            aria-label="选择换算币种"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value === "USD" ? "USD" : "CNY")
            }
            className="min-h-11 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="CNY">CNY 人民币</option>
            <option value="USD">USD 美元</option>
          </select>
          <input
            type="hidden"
            name="amount"
            value={parsed.ok ? (parsed.minor / 100).toFixed(2) : ""}
          />
          <button
            type="submit"
            className="hud-cta inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold"
          >
            继续换算
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        {error ? (
          <p
            id="home-conversion-error"
            role="alert"
            className="mt-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </form>
      {preview ? (
        <ConversionPreview headingId="home-preview-title" preview={preview} />
      ) : (
        <p className="mt-3 break-words text-sm leading-relaxed text-muted-foreground">
          {defaultsUnavailable
            ? "常用对照有项目不可用，请到换算页补选。"
            : items.length < 2
              ? "到换算页保存两项常用对照，之后可在这里同时预览。"
              : parsed.ok
                ? "暂时无法预览，请到换算页检查汇率和单价。"
                : (
                    <>
                      常用对照 ·{" "}
                      <span data-no-translate>
                        {items
                          .map((item) => formatCatalogName(item.name, lang))
                          .join(" / ")}
                      </span>
                    </>
                  )}
        </p>
      )}
      {children}
    </HudPanel>
  );
}
