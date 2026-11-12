import { describe, expect, it } from "vitest";
import {
  applyRate,
  buildSnapshot,
  computeProtectedMinor,
  formatQuantity,
  formatRemainder,
  isCooldownOver,
  normalizeRate,
  parseAmountToMinor,
  parseSnapshot,
  quantityAriaLabel,
  rateToMicro,
} from "@/lib/convert-domain";
import {
  escalateByState,
  isIrreversibleAction,
  suggestRiskLevel,
} from "@/lib/risk";
import { createConfirmationSchema } from "@/lib/validation";
import {
  canTransitionRule,
  canTransitionSession,
  parseIdSnapshot,
} from "@/lib/domain/experience-trigger";
import { evaluateEntertainment } from "@/lib/entertainment-rules";
import {
  calendarDateTime,
  calendarToday,
  isCalendarDate,
  parseCalendarDateTime,
} from "@/lib/calendar";
import { getLifespanProgress } from "@/lib/lifespan-progress";

describe("money and immutable conversion evidence", () => {
  it.each([
    ["0.01", 1],
    ["2,000.50", 200050],
    ["19.99", 1999],
  ])("parses %s exactly", (input, minor) =>
    expect(parseAmountToMinor(String(input))).toEqual({ ok: true, minor }),
  );
  it.each(["", "0", "-1", "1.001", "Infinity", "1e9", "999999999999999999999"])(
    "rejects %s",
    (input) => expect(parseAmountToMinor(input).ok).toBe(false),
  );
  it("uses six-decimal rates and rounds half up", () => {
    expect(normalizeRate("7.3")).toBe("7.300000");
    expect(rateToMicro("0")).toBeNull();
    expect(rateToMicro("1.1234567")).toBeNull();
    expect(rateToMicro("999999999999999999999")).toBeNull();
    expect(applyRate(101, 1500000)).toBe(152);
    for (let amount = 1; amount < 10000; amount += 37) {
      expect(applyRate(amount, 7123456)).toBe(
        Number(
          (BigInt(amount) * BigInt(7123456) + BigInt(500000)) / BigInt(1000000),
        ),
      );
    }
  });
  it("does not count spending as protected money", () => {
    expect(computeProtectedMinor("avoided", 10000, null)).toBe(10000);
    expect(computeProtectedMinor("partial", 10000, 15000)).toBe(0);
    expect(computeProtectedMinor("spent", 10000, 10000)).toBe(0);
    expect(computeProtectedMinor("unknown", 10000, null)).toBe(0);
  });
  it("rejects corrupt snapshots and preserves the original quote", () => {
    expect(parseSnapshot("{")).toBeNull();
    const snapshot = buildSnapshot({
      inputCurrency: "USD",
      amountMinor: 1000,
      usdToCnyRate: "7.000000",
      items: [],
    });
    expect(parseSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });
  it("distinguishes one cent short from an affordable full comparison unit", () => {
    const items = [
      {
        catalogItemId: 1,
        name: "GPT 额度",
        billingType: "credit_pack",
        currency: "USD",
        priceMinor: 12000,
        maxPriceMinor: null,
        unitLabel: "份",
      },
      {
        catalogItemId: 2,
        name: "泰拳训练",
        billingType: "single_unit",
        currency: "CNY",
        priceMinor: 70000,
        maxPriceMinor: null,
        unitLabel: "期",
      },
    ] as const;
    const compare = (amountMinor: number, index: 0 | 1) =>
      buildSnapshot({
        inputCurrency: "CNY",
        amountMinor,
        usdToCnyRate: "7.000000",
        items: [items[index]],
      }).items[0];
    expect(formatQuantity(compare(83999, 0))).toBe("不足 1 份");
    expect(quantityAriaLabel(compare(83999, 0))).toContain("不足 1 份");
    expect(formatRemainder(compare(83999, 0))).toBe("还差 ¥0.01");
    expect(formatQuantity(compare(84000, 0))).toBe("1.00 份");
    expect(formatQuantity(compare(69999, 1))).toBe("不足 1 期");
    expect(formatRemainder(compare(69999, 1))).toBe("还差 ¥0.01");
    expect(formatQuantity(compare(70000, 1))).toBe("1.0 期");
    expect(formatRemainder(compare(80000, 0))).toBe("还差 ¥40.00");
    expect(formatRemainder(compare(80000, 1))).toBe("完整 1 期 + 余额 ¥100.00");
    expect(formatQuantity(compare(83999, 0), "en")).toBe("Less than 1 serving");
    expect(formatRemainder(compare(83999, 0), "en")).toBe("¥0.01 short");
    expect(quantityAriaLabel(compare(70000, 1), "en")).toBe(
      "泰拳训练, 1.0 period, unit price 700.00 CNY",
    );
  });
});
describe("state and time boundaries", () => {
  it("keeps the life grid in year 80 while 14 full weeks remain", () => {
    expect(getLifespanProgress("2000-01-01", "2079-09-23")).toMatchObject({
      daysRemaining: 100,
      weeksRemaining: 14,
      completedSlots: 4_145,
      currentYear: 80,
    });
    expect(getLifespanProgress("2000-01-01", "2079-12-31")).toMatchObject({
      daysRemaining: 1,
      weeksRemaining: 0,
      completedSlots: 4_159,
      currentYear: 80,
    });
  });
  it.each([
    ["2080-01-01", 29_220],
    ["2080-01-02", 29_221],
  ])("finishes the grid without starting year 81 on %s", (today, daysUsed) => {
    expect(getLifespanProgress("2000-01-01", today)).toEqual({
      daysUsed,
      daysRemaining: 0,
      weeksRemaining: 0,
      percentUsed: 100,
      completedSlots: 4_160,
      currentYear: null,
    });
  });
  it.each([
    ["1900-01-01", "1979-12-26"],
    ["2024-02-29", "2104-02-23"],
  ])("counts six days and zero full weeks for %s on %s", (birthDate, today) => {
    expect(getLifespanProgress(birthDate, today)).toMatchObject({
      daysRemaining: 6,
      weeksRemaining: 0,
      completedSlots: 4_159,
      currentYear: 80,
    });
  });
  it("ends a leap-day countdown at the last day of February in a non-leap year", () => {
    const birthDate = "2020-02-29";
    expect(getLifespanProgress(birthDate, "2100-02-27").daysRemaining).toBe(1);
    expect(getLifespanProgress(birthDate, "2100-02-28")).toMatchObject({
      daysUsed: 29_219,
      daysRemaining: 0,
      completedSlots: 4_160,
      currentYear: null,
    });
  });
  it("compares cooldowns across timezone offsets and at the exact boundary", () => {
    const end = "2026-09-30T10:00:00+07:00";
    expect(isCooldownOver(end, new Date("2026-09-30T02:59:59Z"))).toBe(false);
    expect(isCooldownOver(end, new Date("2026-09-30T03:00:00Z"))).toBe(true);
  });
  it("validates real dates and Bangkok day rollover", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    for (const s of ["2026-02-29", "2026-02-31", "2026-13-01", "garbage"])
      expect(isCalendarDate(s)).toBe(false);
    expect(
      calendarToday(new Date("2026-09-30T18:00:00Z"), "Asia/Bangkok"),
    ).toBe("2026-10-01");
  });
  it("round-trips local task deadlines and rejects non-unique or invalid times", () => {
    const deadlines = [
      ["2026-11-12T09:30", "Asia/Bangkok", "2026-11-12T02:30:00.000Z"],
      ["2026-11-12T09:30", "Asia/Kathmandu", "2026-11-12T03:45:00.000Z"],
      ["2026-03-08T03:30", "America/New_York", "2026-03-08T07:30:00.000Z"],
    ];
    for (const [local, timeZone, iso] of deadlines) {
      const instant = new Date(iso);
      expect(calendarDateTime(instant, timeZone)).toBe(local);
      expect(parseCalendarDateTime(local, timeZone)).toEqual(instant);
    }
    expect(
      parseCalendarDateTime("2026-03-08T02:30", "America/New_York"),
    ).toBeNull();
    expect(
      parseCalendarDateTime("2026-11-01T01:30", "America/New_York"),
    ).toBeNull();
    for (const invalid of [
      "2026-02-29T12:00",
      "2026-01-01T24:00",
      "2026-01-01T12:00Z",
    ])
      expect(parseCalendarDateTime(invalid, "Asia/Bangkok")).toBeNull();
  });
  it("keeps archived and validated states terminal", () => {
    expect(canTransitionRule("draft", "active")).toBe(true);
    expect(canTransitionRule("archived", "active")).toBe(false);
    expect(canTransitionSession("validated", "decided")).toBe(false);
    expect(parseIdSnapshot('[1,"2"]')).toEqual([]);
  });
  it("escalates unstable repeated decisions", () => {
    expect(escalateByState("low", "tired", false)).toBe("medium");
    expect(escalateByState("low", "tired", true)).toBe("high");
    expect(isIrreversibleAction("pay")).toBe(true);
    const data = createConfirmationSchema.parse({
      title: "作业提交",
      domain: "study",
      riskLevel: "low",
      mistakeHistory: true,
    });
    expect(suggestRiskLevel(data)).toBe("high");
  });
  it("classifies an over-budget, disruptive entertainment session", () => {
    expect(
      evaluateEntertainment({
        plannedMinutes: 30,
        plannedBudgetCny: 20,
        actualMinutes: 120,
        actualCostCny: 100,
        recoveredEnergy: 0,
        emotionAfter: 1,
        didStopOnTime: false,
        didStayInBudget: false,
        delayedMainline: true,
        regretLevel: 10,
      }).resultLevel,
    ).toBe("harmful");
  });
});

import { safeReturnPath } from "@/lib/return-path";
it("preserves local return paths and rejects external or malformed destinations", () => {
  expect(safeReturnPath("/event-library/new?from=home")).toBe(
    "/event-library/new?from=home",
  );
  for (const path of [
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/sign-in",
    "/\nexample.com",
    null,
  ])
    expect(safeReturnPath(path)).toBe("/");
});
