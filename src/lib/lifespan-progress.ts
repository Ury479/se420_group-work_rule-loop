export const LIFESPAN_REFERENCE_YEARS = 80;
export const LIFESPAN_SLOTS_PER_YEAR = 52;
export const LIFESPAN_TOTAL_SLOTS =
  LIFESPAN_REFERENCE_YEARS * LIFESPAN_SLOTS_PER_YEAR;

const MILLISECONDS_PER_DAY = 86_400_000;

/** Calculate from validated calendar dates without local-time offsets. */
export function getLifespanProgress(birthDate: string, today: string) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const referenceYear = birth.getUTCFullYear() + LIFESPAN_REFERENCE_YEARS;
  const month = birth.getUTCMonth();
  // Feb 29 uses the last day of February when the reference year is not leap.
  const lastDay = new Date(Date.UTC(referenceYear, month + 1, 0)).getUTCDate();
  const referenceTimestamp = Date.UTC(
    referenceYear,
    month,
    Math.min(birth.getUTCDate(), lastDay),
  );
  const birthTimestamp = birth.getTime();
  const todayTimestamp = new Date(`${today}T00:00:00Z`).getTime();
  const referenceDays =
    (referenceTimestamp - birthTimestamp) / MILLISECONDS_PER_DAY;
  const daysUsed = Math.max(
    0,
    (todayTimestamp - birthTimestamp) / MILLISECONDS_PER_DAY,
  );
  const daysRemaining = Math.max(0, referenceDays - daysUsed);
  // 按整个规划周期的比例填格，实际剩余整周单独用天数计算。
  const completedSlots = Math.floor(
    ((referenceDays - daysRemaining) * LIFESPAN_TOTAL_SLOTS) / referenceDays,
  );

  return {
    daysUsed,
    daysRemaining,
    weeksRemaining: Math.floor(daysRemaining / 7),
    percentUsed: Math.min(
      100,
      Math.round((daysUsed / referenceDays) * 1000) / 10,
    ),
    completedSlots,
    currentYear:
      daysRemaining > 0
        ? Math.floor(completedSlots / LIFESPAN_SLOTS_PER_YEAR) + 1
        : null,
  };
}
