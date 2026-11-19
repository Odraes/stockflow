import { describe, expect, it } from "vitest";
import { navItemsFor } from "@/lib/navigation";
import { can, type Permission } from "@/lib/permissions";

/*
 * The app-side permission table must mirror the database rules. These tests
 * pin down the spec so an accidental change is caught.
 */
describe("role permissions", () => {
  const staffOnly: Permission[] = ["dashboard:view", "inventory:view", "stock:use", "stock:waste", "transactions:view"];
  const managerExtra: Permission[] = ["inventory:manage", "categories:manage", "suppliers:manage", "stock:receive", "stock:adjust", "reports:view"];
  const adminOnly: Permission[] = ["users:manage", "settings:manage"];

  it("staff: view + usage + wastage only", () => {
    for (const p of staffOnly) expect(can("staff", p)).toBe(true);
    for (const p of [...managerExtra, ...adminOnly]) expect(can("staff", p)).toBe(false);
  });

  it("manager: operations but no user management", () => {
    for (const p of [...staffOnly, ...managerExtra]) expect(can("manager", p)).toBe(true);
    for (const p of adminOnly) expect(can("manager", p)).toBe(false);
  });

  it("admin: everything", () => {
    for (const p of [...staffOnly, ...managerExtra, ...adminOnly]) expect(can("admin", p)).toBe(true);
  });

  it("staff navigation hides management pages", () => {
    const hrefs = navItemsFor("staff").map((i) => i.href);
    expect(hrefs).toEqual(["/dashboard", "/inventory", "/stock-usage", "/wastage", "/transactions"]);
  });
});
