import { describe, expect, it } from "vitest";
import { csvFileName, toCsv } from "@/lib/csv";

/** Body line of a one-column CSV (drops the BOM and header). */
const cell = (value: string | number | null) => toCsv(["h"], [[value]]).slice(1).split("\r\n")[1];

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and uses CRLF line endings", () => {
    const csv = toCsv(["a", "b"], [["1", 2]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe("a,b\r\n1,2\r\n");
  });

  it("quotes commas, quotes and line breaks (RFC 4180)", () => {
    expect(cell("Milk, oat")).toBe('"Milk, oat"');
    expect(cell('The "good" beans')).toBe('"The ""good"" beans"');
    expect(cell("line1\nline2")).toBe('"line1\nline2"');
  });

  it.each(["=1+1", "+1", "-cmd", "@SUM(A1)", "\tx", "\rx"])("neutralises formula-like text %j", (value) => {
    expect(cell(value).replace(/^"/, "")).toMatch(/^'/);
  });

  it("neutralises a HYPERLINK attack and still quotes it", () => {
    expect(cell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
  });

  it("leaves real numbers alone, including negatives", () => {
    expect(cell(-250)).toBe("-250");
    expect(cell(0.0012)).toBe("0.0012");
  });

  it("writes empty cells for null and non-finite numbers", () => {
    expect(cell(null)).toBe("");
    expect(cell(Number.NaN)).toBe("");
    expect(cell(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("keeps Unicode", () => {
    expect(cell("Crème brûlée")).toBe("Crème brûlée");
  });
});

describe("csvFileName", () => {
  it("only allows safe characters", () => {
    expect(csvFileName("Low stock/../x", "2026-11-19")).toBe("stockpilot-low-stock----x-2026-11-19.csv");
  });
});
