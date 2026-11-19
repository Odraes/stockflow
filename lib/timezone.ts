/**
 * The café's time zone, used to DISPLAY dates and to interpret date filters
 * ("from 19 Nov" = midnight in the café, not midnight UTC).
 *
 * Set CAFE_TIME_ZONE (an IANA name such as "Asia/Manila" or "Europe/Berlin")
 * in .env.local and in Vercel. If unset we fall back to the server's own zone,
 * which is your computer locally but UTC on Vercel.
 *
 * Timestamps are always STORED in UTC (timestamptz); only display and day
 * boundaries depend on this setting.
 */

function resolveTimeZone(value: string | undefined): string {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (!value) return fallback;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return value;
  } catch {
    console.warn(`CAFE_TIME_ZONE "${value}" is not a valid time zone; using ${fallback}.`);
    return fallback;
  }
}

export const CAFE_TIME_ZONE = resolveTimeZone(process.env.CAFE_TIME_ZONE);

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CAFE_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Milliseconds the café zone is ahead of UTC at a given instant (DST-aware). */
function offsetMs(instant: Date): number {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-11-19" → the UTC instant when that day starts in the café. */
export function startOfCafeDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let instant = guess - offsetMs(new Date(guess));
  // Re-check once in case a DST change happens between the guess and the result.
  const corrected = guess - offsetMs(new Date(instant));
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

/** The next day's start, for "to" filters (inclusive of the whole "to" day). */
export function startOfNextCafeDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return startOfCafeDay(next.toISOString().slice(0, 10));
}

/** Today's date in the café, as "YYYY-MM-DD". */
export function todayInCafe(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAFE_TIME_ZONE }).format(now);
}
