const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "19 Nov 2026, 13:10" — consistent date display across the app. */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormat.format(typeof value === "string" ? new Date(value) : value);
}
