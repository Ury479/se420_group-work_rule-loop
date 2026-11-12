export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function appTimeZone(): string {
  return process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Bangkok";
}

export function calendarToday(
  now = new Date(),
  timeZone = appTimeZone(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function calendarTime(
  now = new Date(),
  timeZone = appTimeZone(),
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function calendarDateTime(
  instant: Date,
  timeZone = appTimeZone(),
): string {
  return `${calendarToday(instant, timeZone)}T${calendarTime(instant, timeZone)}`;
}

export function parseCalendarDateTime(
  value: string,
  timeZone = appTimeZone(),
): Date | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ||
    !isCalendarDate(value.slice(0, 10))
  )
    return null;

  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime)) return null;

  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  });
  const offsets = new Set<number>();
  // Probe either side of the wall time to consider both offsets at a transition.
  for (const hours of [-36, 0, 36]) {
    const name = zone
      .formatToParts(new Date(wallTime + hours * 3_600_000))
      .find((part) => part.type === "timeZoneName")?.value;
    if (name === "GMT") {
      offsets.add(0);
      continue;
    }
    const offset = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name ?? "");
    if (!offset) return null;
    const [, sign, hour, minute, second = "0"] = offset;
    const seconds = Number(hour) * 3600 + Number(minute) * 60 + Number(second);
    offsets.add((sign === "-" ? -1 : 1) * seconds * 1000);
  }

  const candidates = [...offsets]
    .map((offset) => new Date(wallTime - offset))
    .filter((instant) => calendarDateTime(instant, timeZone) === value);
  return candidates.length === 1 ? candidates[0] : null;
}
