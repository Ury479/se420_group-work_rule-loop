"use client";
import { reportActionError } from "@/components/action-feedback";

// 价值换算输入页:大金额输入 + 双段状态 + 类别行 + 比较锚点勾选 + 汇率内联编辑,对齐参考稿
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Hourglass,
  CircleCheck,
  Info,
  Lock,
  Pencil,
  Plus,
  Repeat,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CatalogItemEditor,
  EMPTY_CATALOG_ITEM_DRAFT,
  type CatalogItemDraft,
} from "@/components/catalog-item-editor";
import { ConversionPreview } from "@/components/conversion-preview";
import { useTranslator } from "@/components/page-translator";
import { cn } from "@/lib/utils";
import {
  createSpendConversion,
  saveDefaultConversionItems,
  updateConversionPreferences,
} from "@/app/actions/spend-conversion";
import {
  CURRENCY_SYMBOL,
  MAX_SPEND_CONVERSION_MINOR,
  PRIVACY_LABELS,
  buildComparisonPreview,
  conversionQuoteKey,
  formatCatalogName,
  formatCatalogUnit,
  formatMinor,
  normalizeRate,
  parseAmountToMinor,
  type BillingType,
  type CurrencyCode,
  type DecisionStage,
  type SpendInputCurrency,
} from "@/lib/convert-domain";
import type { SpendingAnchor } from "@/db/schema";

const COLLAPSED_ITEM_COUNT = 5;

type Prefs = {
  usdToCnyRate: string;
  defaultCooldownMinutes: number;
  highImpactThresholdMinor: number;
  privacyMode: string;
};

export function ConvertForm({
  items,
  defaultItemIds,
  defaultsUnavailable,
  initialAmount,
  initialCurrency = "CNY",
  initialStage,
  prefs,
}: {
  items: SpendingAnchor[];
  defaultItemIds: number[];
  defaultsUnavailable: boolean;
  initialAmount?: string;
  initialCurrency?: SpendInputCurrency;
  initialStage?: DecisionStage;
  prefs: Prefs;
}) {
  const { lang } = useTranslator();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingDefaults, startSavingDefaults] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  const [amount, setAmount] = useState(initialAmount ?? "");
  const [currency, setCurrency] = useState<SpendInputCurrency>(initialCurrency);
  const [stage, setStage] = useState<DecisionStage>(
    initialStage ?? "considering",
  );
  const [privacyLabel, setPrivacyLabel] = useState<string>(PRIVACY_LABELS[0]);
  const [sensitiveLabel, setSensitiveLabel] = useState("");
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false);
  const [selection, setSelection] = useState<number[] | null>(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [catalogDraft, setCatalogDraft] = useState<CatalogItemDraft | null>(
    null,
  );
  const [addedItems, setAddedItems] = useState<SpendingAnchor[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<{
    name: string;
    reused: boolean;
    selected: boolean;
  } | null>(null);
  const catalogFocus = useRef<string | null>(null);

  useEffect(() => {
    if (catalogDraft || isPending || !catalogFocus.current) return;
    document.getElementById(catalogFocus.current)?.focus();
    catalogFocus.current = null;
  }, [catalogDraft, isPending]);

  // 汇率内联编辑(用户录入,未自动核验)
  const rate = (normalizeRate(prefs.usdToCnyRate) ?? "7.000000").replace(
    /(\.\d{2}\d*?)0+$/,
    "$1",
  );
  const [editingRate, setEditingRate] = useState(false);
  const [rateDraft, setRateDraft] = useState(rate);

  // Keep newly added rows visible even when the ordinary directory list is capped.
  const itemsById = new Map(addedItems.map((item) => [item.id, item]));
  for (const item of items) {
    const pinned = itemsById.get(item.id);
    if (!pinned || item.updatedAt >= pinned.updatedAt) {
      itemsById.set(item.id, item);
    }
  }
  const availableItems = [...itemsById.values()];
  const selectedItems = (selection ?? defaultItemIds).flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
  const selected = selectedItems.map((item) => item.id);
  const catalogInputs = selectedItems.map((item) => ({
    catalogItemId: item.id,
    name: item.name,
    billingType: item.billingType as BillingType,
    currency: item.currency as CurrencyCode,
    priceMinor: item.priceMinor,
    maxPriceMinor: item.maxPriceMinor,
    unitLabel: item.unitLabel,
  }));
  const matchesDefaults =
    defaultItemIds.length === 2 &&
    selected.length === 2 &&
    selected.every((id, index) => id === defaultItemIds[index]);
  const parsedAmount = parseAmountToMinor(amount, MAX_SPEND_CONVERSION_MINOR);
  const preview =
    parsedAmount.ok && selectedItems.length === 2
      ? buildComparisonPreview({
          inputCurrency: currency,
          amountMinor: parsedAmount.minor,
          usdToCnyRate: rate,
          items: catalogInputs,
        })
      : null;

  const visibleItems = showAllItems
    ? availableItems
    : availableItems.filter(
        (item, index) =>
          selected.includes(item.id) || index < COLLAPSED_ITEM_COUNT,
      );
  const hiddenCount = availableItems.length - visibleItems.length;

  // 金额展示格式化(千分位,仅展示用)
  const displayAmount = useMemo(() => {
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n)) return null;
    return n.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [amount]);

  function toggleItem(id: number) {
    setError(null);
    setDefaultsError(null);
    setDefaultsSaved(false);
    setCatalogStatus(null);
    setSelection(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  function closeCatalogEditor(focus = "cv-open-catalog-item") {
    catalogFocus.current = focus;
    setCatalogDraft(null);
  }

  function addCatalogItem(item: SpendingAnchor, reused: boolean) {
    setAddedItems((current) => [
      item,
      ...current.filter(({ id }) => id !== item.id),
    ]);
    const wasSelected = selected.includes(item.id);
    const selectNow = selected.length < 2 && !wasSelected;
    if (selectNow) {
      setSelection([...selected, item.id]);
      setDefaultsError(null);
      setDefaultsSaved(false);
    }
    setCatalogStatus({
      name: item.name,
      reused,
      selected: selectNow || wasSelected,
    });
    closeCatalogEditor(`cv-anchor-item-${item.id}`);
  }

  function saveDefaults() {
    if (selected.length !== 2 || isSavingDefaults) return;

    setDefaultsError(null);
    setDefaultsSaved(false);
    startSavingDefaults(async () => {
      try {
        const result = await saveDefaultConversionItems(selected);
        if (result.error) {
          setDefaultsError(result.error);
          return;
        }
        setSelection(null);
        setDefaultsSaved(true);
      } catch {
        reportActionError();
      }
    });
  }

  function saveRate() {
    const normalized = normalizeRate(rateDraft);
    if (!normalized) {
      setError("汇率必须是大于 0 的数字");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateConversionPreferences({
          usdToCnyRate: normalized,
          defaultCooldownMinutes: prefs.defaultCooldownMinutes,
          highImpactThresholdMinor: prefs.highImpactThresholdMinor,
          privacyMode:
            prefs.privacyMode === "explicit" ? "explicit" : "neutral",
        });
        if ("error" in res && res.error) setError(res.error);
        else setEditingRate(false);
      } catch {
        reportActionError();
      }
    });
  }

  function submit() {
    setError(null);
    if (!parsedAmount.ok) {
      setError(parsedAmount.message);
      return;
    }
    if (selected.length === 0) {
      setError("请至少选择 1 个比较项");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createSpendConversion({
          decisionStage: stage,
          inputCurrency: currency,
          plannedAmountMinor: parsedAmount.minor,
          catalogItemIds: selected,
          privacyLabel,
          sensitiveLabel: sensitiveLabel.trim() || null,
          expectedQuoteKey: conversionQuoteKey(currency, rate, catalogInputs),
        });
        if ("error" in res && res.error) {
          setError(res.error);
          if ("currentItems" in res && res.currentItems) {
            const latest = new Map(
              res.currentItems.map((item) => [item.id, item]),
            );
            setAddedItems((current) =>
              current.flatMap((item) => {
                if (!selected.includes(item.id)) return [item];
                const updated = latest.get(item.id);
                return updated ? [updated] : [];
              }),
            );
            setSelection(selected.filter((id) => latest.has(id)));
            router.refresh();
          }
          return;
        }
        if ("id" in res) router.push(`/convert/${res.id}`);
      } catch {
        reportActionError();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 计划金额 */}
      <section className="shadow-card rounded-xl border bg-card p-4">
        <Label htmlFor="cv-amount" className="text-sm font-semibold">
          计划金额
        </Label>
        <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-border">
          <div
            className="flex shrink-0 border-r border-border"
            role="group"
            aria-label="选择币种"
          >
            {(["CNY", "USD"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
                className={cn(
                  "min-h-14 px-3.5 font-mono text-sm font-semibold transition-colors",
                  currency === code
                    ? "bg-secondary text-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1 bg-background px-3.5">
            <span
              className="shrink-0 font-mono text-2xl font-bold text-muted-foreground"
              aria-hidden="true"
            >
              {CURRENCY_SYMBOL[currency]}
            </span>
            <Input
              id="cv-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2,000.00"
              aria-describedby="cv-amount-hint"
              className="min-h-14 flex-1 border-0 bg-transparent p-0 font-mono text-2xl font-bold tabular-nums shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3">
          <p id="cv-amount-hint" className="text-xs text-muted-foreground">
            {displayAmount
              ? `${CURRENCY_SYMBOL[currency]} ${displayAmount} · `
              : ""}
            最多两位小数,保存在你的私有账户。
          </p>
          <a
            href="#cv-anchors"
            className="inline-flex min-h-10 items-center text-sm font-medium underline-offset-4 hover:underline"
          >
            {selected.length ? "调整本次对照" : "选择比较项"}
          </a>
        </div>

        {preview ? (
          <ConversionPreview headingId="cv-preview-title" preview={preview} />
        ) : null}
      </section>

      {/* 状态双段 */}
      <fieldset>
        <legend className="sr-only">这笔消费的状态</legend>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-input">
          <button
            type="button"
            onClick={() => setStage("considering")}
            aria-pressed={stage === "considering"}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 text-sm font-semibold transition-colors focus-visible:-outline-offset-2",
              stage === "considering"
                ? "bg-secondary text-secondary-foreground shadow-[inset_0_-2px_var(--accent)]"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Hourglass className="size-4" aria-hidden="true" />
            正在考虑
          </button>
          <button
            type="button"
            onClick={() => setStage("spent")}
            aria-pressed={stage === "spent"}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 text-sm font-semibold transition-colors focus-visible:-outline-offset-2",
              stage === "spent"
                ? "bg-secondary text-secondary-foreground shadow-[inset_0_-2px_var(--accent)]"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            已经发生
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {stage === "considering"
            ? "还没付款:换算后可以开始一个冷静期。"
            : "已经付款:只计入历史支出,不会产生保护金额。"}
        </p>
      </fieldset>

      {/* 类别行 */}
      <section className="shadow-card rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => setShowPrivacyOptions((v) => !v)}
          aria-expanded={showPrivacyOptions}
          className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left"
        >
          <span className="text-sm font-semibold">类别</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {privacyLabel}
            <Lock className="size-4" aria-hidden="true" />
          </span>
        </button>
        {showPrivacyOptions && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {PRIVACY_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPrivacyLabel(label)}
                  aria-pressed={privacyLabel === label}
                  className={cn(
                    "min-h-10 rounded-full border px-3.5 text-sm transition-colors",
                    privacyLabel === label
                      ? "border-foreground/30 bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="cv-sensitive"
                className="text-xs text-muted-foreground"
              >
                私密别名(可选,仅在详情页显示)
              </Label>
              <Input
                id="cv-sensitive"
                value={sensitiveLabel}
                maxLength={40}
                onChange={(e) => setSensitiveLabel(e.target.value)}
                placeholder="留空即只显示中性标签"
                className="min-h-10"
              />
            </div>
          </div>
        )}
      </section>

      {/* 比较锚点 */}
      <section
        id="cv-anchors"
        tabIndex={-1}
        aria-labelledby="cv-anchors-title"
        className="shadow-card scroll-mt-4 rounded-xl border bg-card p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h2
              id="cv-anchors-title"
              className="text-sm font-semibold tracking-tight"
            >
              比较锚点
            </h2>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{`· 已选 ${selected.length} 项`}</span>
          </div>
          <button
            id="cv-open-catalog-item"
            type="button"
            disabled={isPending || isSavingDefaults}
            aria-expanded={catalogDraft !== null}
            aria-controls={catalogDraft ? "cv-catalog-item-form" : undefined}
            onClick={() => {
              if (catalogDraft) closeCatalogEditor();
              else {
                setCatalogStatus(null);
                setCatalogDraft(EMPTY_CATALOG_ITEM_DRAFT);
              }
            }}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            添加自定义对照
          </button>
        </div>
        {catalogDraft ? (
          <CatalogItemEditor
            draft={catalogDraft}
            onDraftChange={setCatalogDraft}
            onSaved={addCatalogItem}
            onCancel={() => closeCatalogEditor()}
            isPending={isPending || isSavingDefaults}
            startTransition={startTransition}
            useInConversion
            selectForCurrent={selected.length < 2}
          />
        ) : null}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {defaultsUnavailable
            ? "部分常用对照不可用，请重新选择两项。"
            : defaultItemIds.length === 2
              ? "调整只影响本次换算，保存后才会替换常用对照。"
              : "选两项并保存为常用，下次会自动选中。"}
        </p>
        {availableItems.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            暂无启用的对照，可以在这里添加一项。
          </p>
        ) : null}
        <ul className="mt-3 flex flex-col">
          {visibleItems.map((item, index) => {
            const selectedIndex = selected.indexOf(item.id);
            const active = selectedIndex >= 0;
            const name = formatCatalogName(item.name, lang);
            const isRange =
              item.billingType === "range_unit" && item.maxPriceMinor;
            return (
              <li
                key={item.id}
                className={cn(index > 0 && "border-t border-border")}
              >
                <button
                  id={`cv-anchor-item-${item.id}`}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={active}
                  disabled={isPending || isSavingDefaults}
                  className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/50 disabled:cursor-wait"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border-2 font-mono text-xs font-semibold tabular-nums transition-colors",
                      active
                        ? "border-brand-accent bg-secondary text-secondary-foreground"
                        : "border-input bg-background",
                    )}
                  >
                    {active ? selectedIndex + 1 : null}
                  </span>
                  <span
                    aria-hidden="true"
                    data-no-translate
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background font-mono text-xs font-bold text-muted-foreground"
                  >
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      <span data-no-translate>{name}</span>
                      <span
                        data-no-translate
                        className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums"
                      >
                        {`· ${item.currency === "USD" ? "USD " : "¥"}${formatMinor(item.priceMinor)}`}
                        {isRange
                          ? `–${formatMinor(item.maxPriceMinor as number)}`
                          : ""}
                        {`/${formatCatalogUnit(item.unitLabel, lang)}`}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {(hiddenCount > 0 || showAllItems) && (
          <button
            type="button"
            onClick={() => setShowAllItems((v) => !v)}
            aria-expanded={showAllItems}
            className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border border-dashed border-border px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAllItems
              ? "只看已选与常用项"
              : `查看其他目录项(${hiddenCount})`}
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showAllItems && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={saveDefaults}
            disabled={
              selected.length !== 2 ||
              matchesDefaults ||
              isPending ||
              isSavingDefaults
            }
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingDefaults ? "正在保存常用对照…" : "保存两项为常用"}
          </button>
          <Link
            href="/convert/catalog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            管理价值目录
          </Link>
        </div>
        {catalogStatus || defaultsSaved || defaultsError ? (
          <div className="mt-2">
            {catalogStatus ? (
              <p role="status" data-no-translate className="text-sm text-success">
                {lang === "en"
                  ? `${catalogStatus.reused ? "Using existing item" : "Added"} “${formatCatalogName(catalogStatus.name, lang)}”. ${catalogStatus.selected ? "Selected for this comparison." : "Current selection kept."}`
                  : `${catalogStatus.reused ? "已使用目录中的" : "已添加"}「${catalogStatus.name}」。${catalogStatus.selected ? "本次已选。" : "原选择保留。"}`}
              </p>
            ) : null}
            {defaultsSaved ? (
              <p role="status" className="text-sm text-success">
                已保存两项常用对照。
              </p>
            ) : null}
            {defaultsError ? (
              <p role="alert" className="text-sm text-destructive">
                {defaultsError}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* 汇率行 */}
      <section className="shadow-card flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
        <Repeat
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        {editingRate ? (
          <>
            <label
              htmlFor="cv-rate"
              className="shrink-0 font-mono text-sm font-semibold"
            >
              USD/CNY
            </label>
            <Input
              id="cv-rate"
              inputMode="decimal"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              className="min-h-10 max-w-24 font-mono tabular-nums"
            />
            <button
              type="button"
              onClick={saveRate}
              disabled={isPending || isSavingDefaults}
              className="ml-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Check className="size-4" aria-hidden="true" />
              保存
            </button>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-mono font-semibold tabular-nums">{`USD/CNY ${rate}`}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">
                · 用户录入,未自动核验
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setRateDraft(rate);
                setEditingRate(true);
              }}
              aria-label="编辑汇率"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </section>

      {/* 隐私提示 */}
      <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        换算由服务器计算，不调用 AI
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending || isSavingDefaults}
        className="hud-cta flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
        {isPending ? "正在换算…" : "查看机会成本"}
      </button>
    </div>
  );
}
