"use client";
import { reportActionError } from "@/components/action-feedback";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import {
  CatalogItemEditor,
  EMPTY_CATALOG_ITEM_DRAFT,
  type CatalogItemDraft,
} from "@/components/catalog-item-editor";
import { useTranslator } from "@/components/page-translator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  toggleCatalogItem,
  updateConversionPreferences,
} from "@/app/actions/spend-conversion";
import {
  BILLING_TYPE_LABEL,
  CURRENCY_SYMBOL,
  formatCatalogName,
  formatCatalogUnit,
  formatMinor,
  type BillingType,
  type CurrencyCode,
} from "@/lib/convert-domain";
import type { ConversionPreference, SpendingAnchor } from "@/db/schema";

const DEFAULT_SOURCE_NOTE = "用户录入,未自动核验";

export function CatalogManager({
  items,
  prefs,
}: {
  items: SpendingAnchor[];
  prefs: ConversionPreference;
}) {
  const { lang } = useTranslator();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<CatalogItemDraft | null>(null);

  // 偏好:汇率、默认冷静期、高影响阈值、隐私模式
  const [rate, setRate] = useState(prefs.usdToCnyRate);
  const [cooldown, setCooldown] = useState(
    String(prefs.defaultCooldownMinutes),
  );
  const [threshold, setThreshold] = useState(
    String(Math.round(prefs.highImpactThresholdMinor / 100)),
  );
  const [privacyMode, setPrivacyMode] = useState(prefs.privacyMode);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  function savePrefs() {
    setPrefsMessage(null);
    const cooldownMinutes = Number.parseInt(cooldown, 10);
    const thresholdYuan = Number.parseInt(threshold, 10);
    if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 1) {
      setPrefsMessage("默认冷静期需要是大于 0 的整数分钟");
      return;
    }
    if (!Number.isInteger(thresholdYuan) || thresholdYuan < 1) {
      setPrefsMessage("高影响阈值需要是大于 0 的整数金额");
      return;
    }
    startTransition(async () => {
      try {
        const res = await updateConversionPreferences({
          usdToCnyRate: rate,
          defaultCooldownMinutes: cooldownMinutes,
          highImpactThresholdMinor: thresholdYuan * 100,
          privacyMode: privacyMode as "neutral" | "explicit",
        });
        if (res && "error" in res && res.error) {
          setPrefsMessage(res.error);
          return;
        }
        setPrefsMessage("已保存");
        router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  function onToggle(id: number, next: boolean) {
    startTransition(async () => {
      try {
        await toggleCatalogItem(id, next);
        router.refresh();
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="prefs-title"
        className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="prefs-title" className="text-sm font-semibold tracking-tight">
            汇率与默认值
          </h2>
          <p className="text-xs text-muted-foreground">
            汇率可编辑,每次换算都会保存快照,历史结果不会随之漂移。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-rate">USD → CNY 汇率</Label>
            <Input
              id="pf-rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-cooldown">默认冷静期(分钟)</Label>
            <Input
              id="pf-cooldown"
              inputMode="numeric"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-threshold">高影响阈值(元)</Label>
            <Input
              id="pf-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">隐私模式</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "neutral", label: "中性显示(推荐)" },
              { value: "explicit", label: "详情显示私密别名" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrivacyMode(option.value)}
                aria-pressed={privacyMode === option.value}
                className={cn(
                  "min-h-11 rounded-md border px-3.5 text-sm transition-colors",
                  privacyMode === option.value
                    ? "border-primary bg-primary/10 font-semibold"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {privacyMode === option.value ? "● " : "○ "}
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        {prefsMessage ? (
          <p role="status" className="text-xs text-muted-foreground">
            {prefsMessage}
          </p>
        ) : null}
        <Button
          onClick={savePrefs}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="self-start"
        >
          保存偏好
        </Button>
      </section>

      <section aria-labelledby="catalog-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="catalog-title"
            className="text-sm font-semibold tracking-tight"
          >
            价值目录
          </h2>
          <Button
            size="sm"
            variant={form ? "outline" : "default"}
            disabled={isPending}
            onClick={() => setForm(form ? null : EMPTY_CATALOG_ITEM_DRAFT)}
          >
            <Plus className="size-4" aria-hidden="true" />
            {form ? "收起" : "新增比较项"}
          </Button>
        </div>

        {form ? (
          <CatalogItemEditor
            key={form.id ?? "new"}
            draft={form}
            onDraftChange={setForm}
            onSaved={() => {
              setForm(null);
              router.refresh();
            }}
            isPending={isPending}
            startTransition={startTransition}
          />
        ) : null}

        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3",
                !item.isActive && "opacity-55",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p data-no-translate className="truncate text-sm font-medium">
                  {formatCatalogName(item.name, lang)}
                </p>
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  {CURRENCY_SYMBOL[item.currency as CurrencyCode]}
                  {formatMinor(item.priceMinor)}
                  {item.maxPriceMinor
                    ? `–${formatMinor(item.maxPriceMinor)}`
                    : ""}{" "}
                  /{" "}
                  <span data-no-translate>
                    {formatCatalogUnit(item.unitLabel, lang)}
                  </span>{" "}
                  ·{" "}
                  {BILLING_TYPE_LABEL[item.billingType as BillingType]}
                </p>
                <p data-no-translate className="text-xs text-muted-foreground">
                  {lang === "en" &&
                  (item.sourceNote === null ||
                    item.sourceNote === DEFAULT_SOURCE_NOTE)
                    ? "Entered manually, without automatic verification"
                    : (item.sourceNote ?? DEFAULT_SOURCE_NOTE)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setForm({
                      id: item.id,
                      name: item.name,
                      billingType: item.billingType as BillingType,
                      currency: item.currency as CurrencyCode,
                      price: (item.priceMinor / 100).toFixed(2),
                      maxPrice: item.maxPriceMinor
                        ? (item.maxPriceMinor / 100).toFixed(2)
                        : "",
                      unitLabel: item.unitLabel,
                      sourceNote: item.sourceNote ?? "",
                    })
                  }
                  data-no-translate
                  aria-label={
                    lang === "en"
                      ? `Edit ${formatCatalogName(item.name, lang)}`
                      : `编辑 ${item.name}`
                  }
                  className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(item.id, !item.isActive)}
                  data-no-translate
                  aria-label={
                    lang === "en"
                      ? `${item.isActive ? "Disable" : "Enable"} ${formatCatalogName(item.name, lang)}`
                      : `${item.isActive ? "停用" : "启用"} ${item.name}`
                  }
                  className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.isActive ? (
                    <Eye className="size-4" aria-hidden="true" />
                  ) : (
                    <EyeOff className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          停用只影响新的换算。历史记录始终按当时快照渲染,即使目录项被停用或改名。
        </p>
      </section>
    </div>
  );
}
