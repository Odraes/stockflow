import { describe, expect, it } from "vitest";
import { inventoryHref, parseInventoryQuery } from "@/lib/validations/inventory-query";
import { movementsHref, parseMovementQuery } from "@/lib/validations/movement-query";
import { addDays, parseReportQuery, reportSearch } from "@/lib/reports/query";

describe("inventory URL query", () => {
  it("falls back to safe defaults for garbage", () => {
    expect(parseInventoryQuery({ status: "DROP", sort: "x;--", page: "-3", category: "nope", q: "a,b)" })).toEqual({
      q: "a b", category: null, status: "all", sort: "name", dir: "asc", page: 1, archived: false,
    });
  });
  it("round-trips through inventoryHref, omitting defaults", () => {
    const q = parseInventoryQuery({ q: "milk", status: "low_stock", page: "2" });
    expect(inventoryHref(q)).toBe("/inventory?q=milk&status=low_stock&page=2");
    expect(inventoryHref(q, { page: 1, status: "all", q: "" })).toBe("/inventory");
  });
});

describe("transactions URL query", () => {
  it("swaps reversed dates and rejects impossible ones", () => {
    expect(parseMovementQuery({ from: "2026-12-31", to: "2026-01-01" })).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
    expect(parseMovementQuery({ from: "2026-02-31", type: "hack" })).toMatchObject({ from: null, type: null });
    expect(movementsHref(parseMovementQuery({ type: "wastage" }))).toBe("/transactions?type=wastage");
  });
});

describe("report URL query", () => {
  it("defaults to the inventory report and a 30-day period", () => {
    const q = parseReportQuery({});
    expect(q.report).toBe("inventory");
    expect(addDays(q.to, -29)).toBe(q.from);
  });
  it("clamps days and only serialises filters the report uses", () => {
    const q = parseReportQuery({ report: "expiring", days: "9999", status: "low_stock" });
    expect(q.days).toBe(365);
    expect(reportSearch(q)).toBe("report=expiring&days=365");
  });
  it("addDays crosses months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
