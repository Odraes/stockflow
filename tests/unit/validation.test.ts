import { describe, expect, it } from "vitest";
import { parseCategory } from "@/lib/validations/category";
import { parseItem, type ItemFormValues } from "@/lib/validations/item";
import { parseAdjust, parseReceive, parseUsage, parseWastage } from "@/lib/validations/stock";
import { parseSupplier } from "@/lib/validations/supplier";

const ID = "9f594958-4efa-4546-b61f-08b9fbed09d4";
const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
};

describe("parseItem", () => {
  const valid: ItemFormValues = {
    name: "Fresh milk", sku: " milk-1l ", description: "", category_id: ID, supplier_id: "",
    unit: "ml", min_stock: "2000", location: "",
  };

  it("normalises the SKU and empty optional fields", () => {
    const r = parseItem({ ...valid, sku: "milk-1l" });
    expect(r.ok && r.data).toMatchObject({ sku: "MILK-1L", supplier_id: null, description: null, min_stock: 2000 });
  });

  it.each([
    ["sku", "bad sku!", "sku"],
    ["unit", "kg", "unit"],
    ["min_stock", "-1", "min_stock"],
    ["min_stock", "1.0005", "min_stock"],
    ["category_id", "x", "category_id"],
    ["name", "", "name"],
  ] as const)("rejects %s=%j", (field, value, errorField) => {
    const r = parseItem({ ...valid, [field]: value });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[errorField]).toBeTruthy();
  });
});

describe("stock forms", () => {
  const base = { item_id: ID, unit: "ml" };

  it("receive: accepts either cost, not both", () => {
    expect(parseReceive({ ...base, quantity: "1000", total_cost: "1.20" }).ok).toBe(true);
    const both = parseReceive({ ...base, quantity: "10", unit_cost: "1", total_cost: "10" });
    expect(!both.ok && both.errors.total_cost).toMatch(/either/);
  });

  it("receive: validates quantity, dates and expiry", () => {
    expect(parseReceive({ ...base, quantity: "0" }).ok).toBe(false);
    expect(parseReceive({ ...base, quantity: "1.2345" }).ok).toBe(false);
    expect(parseReceive({ ...base, quantity: "1", expiration_date: "2026-02-31" }).ok).toBe(false);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const r = parseReceive({ ...base, quantity: "1", occurred_at: future });
    expect(!r.ok && r.errors.occurred_at).toMatch(/future/);
  });

  it("usage: empty date means now (null)", () => {
    const r = parseUsage({ ...base, quantity: "5" });
    expect(r.ok && r.data.occurred_at).toBeNull();
  });

  it("wastage: reason required; 'Other' uses the typed reason", () => {
    expect(parseWastage({ ...base, quantity: "5" }).ok).toBe(false);
    const other = parseWastage({ ...base, quantity: "5", reason: "Other", reason_other: "Crushed" });
    expect(other.ok && other.data.reason).toBe("Crushed");
    const missing = parseWastage({ ...base, quantity: "5", reason: "Other" });
    expect(!missing.ok && missing.errors.reason_other).toBeTruthy();
  });

  it("adjust: zero allowed, reason required", () => {
    expect(parseAdjust({ ...base, new_quantity: "0", reason: "Count" }).ok).toBe(true);
    expect(parseAdjust({ ...base, new_quantity: "0", reason: "" }).ok).toBe(false);
    expect(parseAdjust({ ...base, new_quantity: "-1", reason: "Count" }).ok).toBe(false);
  });

  it("rejects a unit that isn't a stock unit", () => {
    expect(parseUsage({ item_id: ID, unit: "kg", quantity: "1" }).ok).toBe(false);
  });
});

describe("categories and suppliers", () => {
  it("category name required, max 80", () => {
    expect(parseCategory(fd({ name: "  " })).ok).toBe(false);
    expect(parseCategory(fd({ name: "x".repeat(81) })).ok).toBe(false);
    expect(parseCategory(fd({ name: "Dairy" })).ok).toBe(true);
  });

  it("supplier: email lower-cased, bad phone/email rejected", () => {
    const empty = { name: "Metro Dairy", contact_person: "", phone: "", email: "", address: "", notes: "" };
    const ok = parseSupplier({ ...empty, email: "Orders@Example.COM", phone: "+63 912 345 6789" });
    expect(ok.ok && ok.data.email).toBe("orders@example.com");
    const bad = parseSupplier({ ...empty, email: "nope", phone: "call me" });
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(["email", "phone"]);
  });
});
