/**
 * Minimal, dependency-free CSV writer (RFC 4180) with spreadsheet-safety.
 *
 * Two things matter:
 *  1. Quoting: values containing commas, quotes or line breaks are wrapped in
 *     double quotes, and inner quotes are doubled ("" ).
 *  2. CSV/formula injection: Excel and Google Sheets execute a cell that starts
 *     with = + - @ (or tab / carriage return) as a FORMULA. A malicious item
 *     name like `=HYPERLINK("http://evil","click")` would run when a manager
 *     opens the export. Text cells starting with those characters get a
 *     leading apostrophe, which spreadsheets treat as "this is text".
 *     Real numbers (e.g. -250 for a usage) are written as numbers, untouched.
 */

export type CsvCell = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build CSV text. Starts with a UTF-8 BOM so Excel shows accents (é, ñ) correctly. */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** A safe file name: "stockpilot-wastage-2026-11-19.csv". */
export function csvFileName(name: string, date: string): string {
  return `stockpilot-${name.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-${date}.csv`;
}
