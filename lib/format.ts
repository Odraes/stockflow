const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "19 Nov 2026, 13:10" — consistent date display across the app. */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(typeof value === "string" ? new Date(value) : value);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

/** For DATE columns ("2026-11-21" → "21 Nov 2026"). UTC so the day never shifts. */
export function formatDate(value: string): string {
  return dateFormat.format(new Date(`${value}T00:00:00Z`));
}
