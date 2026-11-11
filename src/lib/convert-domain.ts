// ─────────────────────────────────────────────
// 消费价值换算领域纯函数
// 规则:金额一律用整数「分」(minor unit)计算;汇率用定点小数字符串;
// 数量以十进制字符串作为真值,显示精度不回写存储。
// ─────────────────────────────────────────────

export type CurrencyCode = "CNY" | "USD" | "THB";
export type SpendInputCurrency = Extract<CurrencyCode, "CNY" | "USD">;
export type BillingType =
  | "subscription"
  | "credit_pack"
  | "single_unit"
  | "range_unit";
export type DecisionStage = "considering" | "spent";
export type Resolution = "avoided" | "partial" | "spent" | "unknown";

export const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  CNY: "人民币 CNY",
  USD: "美元 USD",
  THB: "泰铢 THB",
};
export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  CNY: "¥",
  USD: "$",
  THB: "฿",
};

export const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  subscription: "月订阅",
  credit_pack: "充值包",
  single_unit: "一次性单位",
  range_unit: "区间单价",
};

export const DECISION_STAGE_LABEL: Record<DecisionStage, string> = {
  considering: "正在考虑",
  spent: "已经发生",
};

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  avoided: "已放弃",
  partial: "部分消费",
  spent: "已消费",
  unknown: "暂不记录",
};

export const PRIVACY_LABELS = [
  "私密消费",
  "娱乐",
  "购物",
  "餐饮",
  "其他",
] as const;

export const COOLDOWN_PRESETS = [
  { minutes: 15, label: "15 分钟" },
  { minutes: 120, label: "2 小时" },
  { minutes: 1440, label: "24 小时" },
] as const;

export const MINIMUM_ACTIONS = [
  "关闭当前付款页面",
  "离开当前场景",
  "联系可信任的人",
  "把金额暂存到目标预算",
] as const;

export const MAX_COOLDOWN_MINUTES = 10080;
export const MAX_SPEND_CONVERSION_MINOR = 10_000_000_00;

// ── 金额解析与格式化 ────────────────────────

/** 解析用户输入的金额字符串为整数分;要求 > 0 且最多两位小数 */
export function parseAmountToMinor(
  raw: string,
  maxMinor = 100_000_000_00,
): { ok: true; minor: number } | { ok: false; message: string } {
  const value = raw.trim().replace(/,/g, "");
  if (!value) return { ok: false, message: "请填写金额" };
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    return {
      ok: false,
      message: "金额只能是数字,最多两位小数(例如 2000 或 2000.50)",
    };
  const minor = Math.round(Number(value) * 100);
  if (minor <= 0) return { ok: false, message: "金额需大于 0" };
  if (minor > maxMinor) return { ok: false, message: "金额过大,请分次记录" };
  return { ok: true, minor };
}

/** 整数分 → 两位小数字符串(带千分位) */
export function formatMinor(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const yuan = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}${yuan.toLocaleString("zh-CN")}.${String(cents).padStart(2, "0")}`;
}

/** 列表摘要用:整数金额省略 .00 */
export function formatMinorCompact(minor: number): string {
  const text = formatMinor(minor);
  return text.endsWith(".00") ? text.slice(0, -3) : text;
}

export function formatCny(minor: number | bigint): string {
  if (typeof minor === "number") return `¥${formatMinor(minor)}`;
  const sign = minor < 0 ? "-" : "";
  const abs = minor < 0 ? -minor : minor;
  const yuan = (abs / BigInt(100)).toLocaleString("zh-CN");
  const cents = String(abs % BigInt(100)).padStart(2, "0");
  return `¥${sign}${yuan}.${cents}`;
}

// ── 汇率(定点小数) ────────────────────────

/** 汇率字符串 → 微单位整数(×1e6);非法返回 null */
export function rateToMicro(rate: string): number | null {
  const value = rate.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(value)) return null;
  const micro = Math.round(Number(value) * 1_000_000);
  return Number.isSafeInteger(micro) && micro > 0 ? micro : null;
}

export function normalizeRate(rate: string): string | null {
  const micro = rateToMicro(rate);
  return micro === null ? null : (micro / 1_000_000).toFixed(6);
}

/** 整数分 × 汇率,round-half-up 到分 */
export function applyRate(minor: number, rateMicro: number): number {
  if (
    !Number.isSafeInteger(minor) ||
    minor < 0 ||
    !Number.isSafeInteger(rateMicro) ||
    rateMicro <= 0
  )
    throw new Error("金额或汇率无效");
  const result = Number(
    (BigInt(minor) * BigInt(rateMicro) + BigInt(500000)) / BigInt(1000000),
  );
  if (!Number.isSafeInteger(result)) throw new Error("换算结果过大");
  return result;
}

/** 币种 → 兑人民币汇率字符串 */
export function currencyToCnyRate(
  currency: CurrencyCode,
  usdToCnyRate: string,
): string {
  if (currency === "CNY") return "1.000000";
  if (currency === "USD") return normalizeRate(usdToCnyRate) ?? "7.000000";
  return "0.200000"; // THB 预留基线,可在偏好中扩展
}

// ── 单项等值计算 ────────────────────────

export type CatalogInput = {
  catalogItemId: number;
  name: string;
  billingType: BillingType;
  currency: CurrencyCode;
  priceMinor: number;
  maxPriceMinor: number | null;
  unitLabel: string;
};

// Compare the displayed price basis before recording a server-calculated snapshot.
export function conversionQuoteKey(
  inputCurrency: CurrencyCode,
  usdToCnyRate: string,
  items: CatalogInput[],
): string {
  const usesUsd =
    inputCurrency === "USD" || items.some((item) => item.currency === "USD");
  return JSON.stringify([
    usesUsd ? currencyToCnyRate("USD", usdToCnyRate) : null,
    items.map((item) => [
      item.catalogItemId,
      item.name,
      item.billingType,
      item.currency,
      item.priceMinor,
      item.maxPriceMinor,
      item.unitLabel,
    ]),
  ]);
}

export type SnapshotItem = {
  catalogItemId: number;
  name: string;
  billingType: BillingType;
  currency: CurrencyCode;
  priceMinor: number;
  maxPriceMinor: number | null;
  unitLabel: string;
  toCnyRate: string;
  cnyPriceMinor: number;
  cnyMaxPriceMinor: number | null;
  /** 十进制字符串真值,6 位小数 */
  quantity: string;
  wholeUnits: number;
  remainderCnyMinor: number;
  /** 仅区间单价 */
  minimumWholeUnits: number | null;
  maximumWholeUnits: number | null;
};

export type ConversionSnapshot = {
  schemaVersion: 1;
  calculatedAt: string;
  input: {
    currency: CurrencyCode;
    amountMinor: number;
    toCnyRate: string;
    cnyAmountMinor: number;
  };
  items: SnapshotItem[];
};

/** 十进制除法 → 6 位小数字符串,避免浮点作为真值 */
function divideToDecimalString(numerator: number, denominator: number): string {
  if (denominator <= 0) return "0.000000";
  const scaled = Math.floor((numerator * 1_000_000) / denominator);
  const intPart = Math.floor(scaled / 1_000_000);
  const fracPart = scaled % 1_000_000;
  return `${intPart}.${String(fracPart).padStart(6, "0")}`;
}

export function computeSnapshotItem(
  item: CatalogInput,
  cnyAmountMinor: number,
  usdToCnyRate: string,
): SnapshotItem {
  const toCnyRate = currencyToCnyRate(item.currency, usdToCnyRate);
  const rateMicro = rateToMicro(toCnyRate) ?? 1_000_000;
  const cnyPriceMinor = applyRate(item.priceMinor, rateMicro);
  const cnyMaxPriceMinor =
    item.maxPriceMinor === null
      ? null
      : applyRate(item.maxPriceMinor, rateMicro);

  const isRange =
    item.billingType === "range_unit" &&
    cnyMaxPriceMinor !== null &&
    cnyMaxPriceMinor > 0;
  const quantity = divideToDecimalString(cnyAmountMinor, cnyPriceMinor);
  const wholeUnits =
    cnyPriceMinor > 0 ? Math.floor(cnyAmountMinor / cnyPriceMinor) : 0;

  return {
    catalogItemId: item.catalogItemId,
    name: item.name,
    billingType: item.billingType,
    currency: item.currency,
    priceMinor: item.priceMinor,
    maxPriceMinor: item.maxPriceMinor,
    unitLabel: item.unitLabel,
    toCnyRate,
    cnyPriceMinor,
    cnyMaxPriceMinor,
    quantity,
    wholeUnits,
    remainderCnyMinor: cnyAmountMinor - wholeUnits * cnyPriceMinor,
    minimumWholeUnits: isRange
      ? Math.floor(cnyAmountMinor / (cnyMaxPriceMinor as number))
      : null,
    maximumWholeUnits: isRange
      ? Math.floor(cnyAmountMinor / cnyPriceMinor)
      : null,
  };
}

export function buildSnapshot(params: {
  inputCurrency: CurrencyCode;
  amountMinor: number;
  usdToCnyRate: string;
  items: CatalogInput[];
  calculatedAt?: Date;
}): ConversionSnapshot {
  const inputRate = currencyToCnyRate(
    params.inputCurrency,
    params.usdToCnyRate,
  );
  const cnyAmountMinor = applyRate(
    params.amountMinor,
    rateToMicro(inputRate) ?? 1_000_000,
  );
  return {
    schemaVersion: 1,
    calculatedAt: (params.calculatedAt ?? new Date()).toISOString(),
    input: {
      currency: params.inputCurrency,
      amountMinor: params.amountMinor,
      toCnyRate: inputRate,
      cnyAmountMinor,
    },
    items: params.items.map((item) =>
      computeSnapshotItem(item, cnyAmountMinor, params.usdToCnyRate),
    ),
  };
}

export function buildComparisonPreview(
  params: Parameters<typeof buildSnapshot>[0],
) {
  if (params.items.length !== 2) return null;
  try {
    const preview = buildSnapshot({ ...params, calculatedAt: new Date(0) });
    return preview.input.cnyAmountMinor > 0 &&
      preview.items.every((item) => item.cnyPriceMinor > 0)
      ? preview
      : null;
  } catch {
    return null;
  }
}

/** 反序列化并做最小校验;损坏时返回 null,由调用方降级显示 */
export function parseSnapshot(raw: string): ConversionSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as ConversionSnapshot;
    if (
      parsed?.schemaVersion !== 1 ||
      !parsed.input ||
      !Array.isArray(parsed.items)
    )
      return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── 显示格式 ────────────────────────

type ConversionLanguage = "zh" | "en";

// Match built-in and legacy labels in both the live catalog and saved snapshots.
const ENGLISH_CATALOG_NAMES = new Map([
  ["豆包个人高阶版", "Doubao Premium"],
  ["智谱官方额度", "Zhipu credits"],
  ["Claude Pro 年付月均", "Claude Pro (annual plan, per month)"],
  ["GPT API 额度包", "GPT API credit pack"],
  ["日常一顿饭", "Everyday meal"],
  ["面膜", "Face masks"],
  ["Cursor 会员", "Cursor membership"],
  ["v0 账号", "v0 account"],
  ["GPT 顶配大模型", "GPT premium plan"],
  ["zcode 额度", "Zcode credits"],
  ["一顿大餐", "Dinner out"],
  ["微信读书会员", "WeRead membership"],
]);

const ENGLISH_CATALOG_UNITS = new Map<string, [singular: string, plural: string]>([
  ["个月", ["month", "months"]],
  ["张", ["ticket", "tickets"]],
  ["顿", ["meal", "meals"]],
  ["包", ["pack", "packs"]],
  ["份", ["serving", "servings"]],
  ["杯", ["cup", "cups"]],
  ["本", ["book", "books"]],
  ["期", ["period", "periods"]],
  ["1 个月", ["month", "months"]],
  ["1 顿", ["meal", "meals"]],
  ["1 份", ["serving", "servings"]],
  ["15 张", ["pack of 15 sheets", "packs of 15 sheets"]],
  ["半个月用量", ["half-month allowance", "half-month allowances"]],
]);

export function formatCatalogName(
  name: string,
  lang: ConversionLanguage,
): string {
  return lang === "en" ? ENGLISH_CATALOG_NAMES.get(name) ?? name : name;
}

export function formatCatalogUnit(
  unit: string,
  lang: ConversionLanguage,
  plural = false,
): string {
  if (lang === "zh") return unit;
  return ENGLISH_CATALOG_UNITS.get(unit)?.[plural ? 1 : 0] ?? unit;
}

/** 按计费语义格式化数量:订阅 1 位小数、充值包 2 位小数、区间整数范围 */
export function formatQuantity(
  item: SnapshotItem,
  lang: ConversionLanguage = "zh",
): string {
  if (
    item.billingType === "range_unit" &&
    item.minimumWholeUnits !== null &&
    item.maximumWholeUnits !== null
  ) {
    const plural = item.minimumWholeUnits !== 1 || item.maximumWholeUnits !== 1;
    const unit = formatCatalogUnit(item.unitLabel, lang, plural);
    return `${item.minimumWholeUnits}–${item.maximumWholeUnits} ${unit}`;
  }
  const digits = item.billingType === "credit_pack" ? 2 : 1;
  const displayed = Number(item.quantity).toFixed(digits);
  const nextWholeUnit = item.wholeUnits + 1;
  if (Number(displayed) === nextWholeUnit) {
    const unit = formatCatalogUnit(item.unitLabel, lang, nextWholeUnit !== 1);
    const prefix = lang === "en" ? "Less than" : "不足";
    return `${prefix} ${nextWholeUnit} ${unit}`;
  }
  const unit = formatCatalogUnit(item.unitLabel, lang, Number(displayed) !== 1);
  return `${displayed} ${unit}`;
}

/** 说明整份数和余额，或补足第一份需要的金额。 */
export function formatRemainder(
  item: SnapshotItem,
  lang: ConversionLanguage = "zh",
): string {
  if (item.billingType === "range_unit") return "";
  if (item.wholeUnits === 0 && item.cnyPriceMinor > 0) {
    const shortfall = formatCny(item.cnyPriceMinor - item.remainderCnyMinor);
    return lang === "en" ? `${shortfall} short` : `还差 ${shortfall}`;
  }
  const unit = formatCatalogUnit(item.unitLabel, lang, item.wholeUnits !== 1);
  const quantity = `${item.wholeUnits} ${unit}`;
  const remainder = formatCny(item.remainderCnyMinor);
  return lang === "en"
    ? `${quantity} + ${remainder} left`
    : `完整 ${quantity} + 余额 ${remainder}`;
}

/** 屏幕阅读器文本:必须读出币种、数量与单位 */
export function quantityAriaLabel(
  item: SnapshotItem,
  lang: ConversionLanguage = "zh",
): string {
  const price = formatMinor(item.cnyPriceMinor);
  if (
    item.billingType === "range_unit" &&
    item.minimumWholeUnits !== null &&
    item.maximumWholeUnits !== null
  ) {
    const maxPrice = formatMinor(item.cnyMaxPriceMinor ?? item.cnyPriceMinor);
    if (lang === "en") {
      const range = formatQuantity(item, lang).replace("–", " to ");
      return `${formatCatalogName(item.name, lang)}, about ${range}, unit price ${price} to ${maxPrice} CNY`;
    }
    return `${item.name},约 ${item.minimumWholeUnits} 到 ${item.maximumWholeUnits} ${item.unitLabel},单价人民币 ${price} 到 ${maxPrice} 元`;
  }
  if (lang === "en") {
    return `${formatCatalogName(item.name, lang)}, ${formatQuantity(item, lang)}, unit price ${price} CNY`;
  }
  return `${item.name},${formatQuantity(item)},单价人民币 ${price} 元`;
}

// ── 最终结果与派生金额 ────────────────────────

type StoredConversionPlan = {
  inputCurrency: string;
  plannedAmountMinor: number;
  inputToCnyRate: string;
};

export function getPlannedConversionCnyMinor(plan: StoredConversionPlan) {
  if (plan.inputCurrency === "CNY") return plan.plannedAmountMinor;
  const rate = rateToMicro(plan.inputToCnyRate);
  if (rate === null) return null;
  try {
    return applyRate(plan.plannedAmountMinor, rate);
  } catch {
    return null;
  }
}

export function getConversionCnyAmounts(
  row: StoredConversionPlan & {
    decisionStage: string;
    resolution: string | null;
    actualAmountMinor: number | null;
    outcomeAmountsInCny: boolean;
  },
) {
  const plannedCnyMinor = getPlannedConversionCnyMinor(row);
  const alreadySpent = row.decisionStage === "spent";
  const partial = row.resolution === "partial";
  const spent = row.resolution === "spent";
  const avoided = row.resolution === "avoided";
  // Legacy full-spend rows used the original amount when the field was blank.
  const ambiguous =
    spent &&
    !row.outcomeAmountsInCny &&
    row.actualAmountMinor === row.plannedAmountMinor &&
    plannedCnyMinor !== row.plannedAmountMinor;
  const actualCnyMinor = alreadySpent
    ? plannedCnyMinor
    : (partial || spent) && !ambiguous
      ? row.actualAmountMinor
      : null;
  const protectedCnyMinor =
    alreadySpent || (!partial && !avoided)
      ? 0
      : plannedCnyMinor === null || (partial && actualCnyMinor === null)
        ? null
        : computeProtectedMinor(
            avoided ? "avoided" : "partial",
            plannedCnyMinor,
            actualCnyMinor,
          );

  return { plannedCnyMinor, actualCnyMinor, protectedCnyMinor };
}

/** 保护金额:已发生消费永远为 0,不得显示为账户余额 */
export function computeProtectedMinor(
  resolution: Resolution,
  plannedMinor: number,
  actualMinor: number | null,
): number {
  if (resolution === "avoided") return plannedMinor;
  if (resolution === "partial")
    return Math.max(plannedMinor - (actualMinor ?? 0), 0);
  return 0;
}

/** 超额消费金额(actual > planned 时为事实记录,不产生保护金额) */
export function computeOverspendMinor(
  plannedMinor: number,
  actualMinor: number | null,
): number {
  return Math.max((actualMinor ?? 0) - plannedMinor, 0);
}

export function isCooldownOver(
  cooldownEndsAt: Date | string | null,
  now: Date = new Date(),
): boolean {
  if (!cooldownEndsAt) return true;
  return new Date(cooldownEndsAt).getTime() <= now.getTime();
}

export function formatCooldownMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  if (minutes % 1440 === 0) return `${minutes / 1440} 天`;
  if (minutes % 60 === 0) return `${minutes / 60} 小时`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}
