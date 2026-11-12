"use client";

import {
  useEffect,
  useRef,
  useState,
  type TransitionStartFunction,
} from "react";
import { upsertCatalogItem } from "@/app/actions/spend-conversion";
import { reportActionError } from "@/components/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SpendingAnchor } from "@/db/schema";
import {
  BILLING_TYPE_LABEL,
  CURRENCY_SYMBOL,
  parseAmountToMinor,
  type BillingType,
  type CurrencyCode,
} from "@/lib/convert-domain";
import { cn } from "@/lib/utils";

const BILLING_TYPES: BillingType[] = [
  "subscription",
  "credit_pack",
  "single_unit",
  "range_unit",
];
const CURRENCIES: CurrencyCode[] = ["CNY", "USD"];

export type CatalogItemDraft = {
  id: number | null;
  name: string;
  billingType: BillingType;
  currency: CurrencyCode;
  price: string;
  maxPrice: string;
  unitLabel: string;
  sourceNote: string;
};

export const EMPTY_CATALOG_ITEM_DRAFT: CatalogItemDraft = {
  id: null,
  name: "",
  billingType: "subscription",
  currency: "CNY",
  price: "",
  maxPrice: "",
  unitLabel: "个月",
  sourceNote: "",
};

export function CatalogItemEditor({
  draft,
  onDraftChange,
  onSaved,
  onCancel,
  isPending,
  startTransition,
  useInConversion = false,
  selectForCurrent = false,
}: {
  draft: CatalogItemDraft;
  onDraftChange: (draft: CatalogItemDraft) => void;
  onSaved: (item: SpendingAnchor, reused: boolean) => void;
  onCancel?: () => void;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  useInConversion?: boolean;
  selectForCurrent?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const prefix = useInConversion ? "cv-catalog-item" : "ct";
  const requiredMark = useInConversion ? "" : " *";
  const submitLabel = draft.id
    ? "保存修改"
    : selectForCurrent
      ? "添加并用于本次"
      : "添加到目录";

  useEffect(() => {
    if (useInConversion) nameInput.current?.focus();
  }, [useInConversion]);

  function submitItem() {
    if (isPending) return;
    setError(null);
    const price = parseAmountToMinor(draft.price);
    if (!price.ok) {
      setError(price.message);
      return;
    }
    let maxPriceMinor: number | null = null;
    if (draft.billingType === "range_unit") {
      const parsedMax = parseAmountToMinor(draft.maxPrice);
      if (!parsedMax.ok) {
        setError("区间单价必须填写有效的价格上限");
        return;
      }
      maxPriceMinor = parsedMax.minor;
    }
    startTransition(async () => {
      try {
        const result = await upsertCatalogItem({
          id: draft.id,
          name: draft.name.trim(),
          billingType: draft.billingType,
          currency: draft.currency,
          priceMinor: price.minor,
          maxPriceMinor,
          unitLabel: draft.unitLabel.trim() || "份",
          sourceNote: draft.sourceNote.trim() || null,
          useInConversion,
        });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        onSaved(result.item, result.reused);
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <form
      id={`${prefix}-form`}
      aria-label={
        useInConversion
          ? "添加自定义对照"
          : draft.id
            ? "编辑比较项"
            : "新增比较项"
      }
      aria-busy={isPending}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        useInConversion
          ? "mt-3 border-primary/35 bg-background"
          : "shadow-card bg-card",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        submitItem();
      }}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !event.nativeEvent.isComposing &&
          onCancel &&
          !isPending
        ) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      {useInConversion && (
        <div>
          <h3 className="text-sm font-semibold">新建自定义对照</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {selectForCurrent
              ? "添加到价值目录，同时选入本次换算。"
              : "添加到价值目录，保留本次已选项。"}
          </p>
        </div>
      )}
      <div
        className={cn(
          "grid gap-3",
          useInConversion
            ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            : "sm:grid-cols-2",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-1.5",
            useInConversion && "col-span-2",
          )}
        >
          <Label htmlFor={`${prefix}-name`}>名称{requiredMark}</Label>
          <Input
            ref={nameInput}
            id={`${prefix}-name`}
            value={draft.name}
            onChange={(event) =>
              onDraftChange({ ...draft, name: event.target.value })
            }
            placeholder="如：AI 工具额度"
            disabled={isPending}
            className="min-h-11"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${prefix}-price`}>单价{requiredMark}</Label>
          <Input
            id={`${prefix}-price`}
            inputMode="decimal"
            value={draft.price}
            onChange={(event) =>
              onDraftChange({ ...draft, price: event.target.value })
            }
            placeholder="20.00"
            disabled={isPending}
            className="min-h-11 font-mono tabular-nums"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${prefix}-unit`}>单位{requiredMark}</Label>
          <Input
            id={`${prefix}-unit`}
            value={draft.unitLabel}
            onChange={(event) =>
              onDraftChange({ ...draft, unitLabel: event.target.value })
            }
            placeholder="个月 / 包 / 期 / 份"
            disabled={isPending}
            className="min-h-11"
          />
        </div>
        {draft.billingType === "range_unit" && (
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${prefix}-max`}>价格上限{requiredMark}</Label>
            <Input
              id={`${prefix}-max`}
              inputMode="decimal"
              value={draft.maxPrice}
              onChange={(event) =>
                onDraftChange({ ...draft, maxPrice: event.target.value })
              }
              placeholder="60.00"
              disabled={isPending}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
        )}
      </div>

      <fieldset className="min-w-0" disabled={isPending}>
        <legend className="mb-1.5 text-sm font-medium">计费类型</legend>
        <div className="flex flex-wrap gap-2">
          {BILLING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onDraftChange({ ...draft, billingType: type })}
              aria-pressed={draft.billingType === type}
              className={cn(
                "min-h-11 rounded-md border text-sm transition-colors",
                useInConversion ? "px-2" : "px-3.5",
                draft.billingType === type
                  ? "border-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {BILLING_TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0" disabled={isPending}>
        <legend className="mb-1.5 text-sm font-medium">币种</legend>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onDraftChange({ ...draft, currency: code })}
              aria-pressed={draft.currency === code}
              className={cn(
                "min-h-11 rounded-md border px-3.5 font-mono text-sm transition-colors",
                draft.currency === code
                  ? "border-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {CURRENCY_SYMBOL[code]} {code}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${prefix}-note`}>价格来源备注</Label>
        <Input
          id={`${prefix}-note`}
          value={draft.sourceNote}
          onChange={(event) =>
            onDraftChange({ ...draft, sourceNote: event.target.value })
          }
          placeholder={
            useInConversion
              ? "可选，例如本人录入的训练报价"
              : "如:用户录入,未自动核验"
          }
          disabled={isPending}
          className="min-h-11"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div
        className={cn("flex flex-wrap gap-2", useInConversion && "justify-end")}
      >
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
            className="min-h-11"
          >
            取消
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          size="sm"
          className={cn(useInConversion && "min-h-11")}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
