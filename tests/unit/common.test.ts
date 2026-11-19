import { describe, expect, it } from "vitest";
import { isAccountStatus, isAppRole, isUuid, safeRedirectPath, sanitizeSearch } from "@/lib/validations/common";

describe("safeRedirectPath (open-redirect protection)", () => {
  it.each(["/dashboard", "/inventory?q=milk", "/auth/update-password"])("allows %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, undefined])(
    "rejects %j",
    (path) => {
      expect(safeRedirectPath(path)).toBe("/dashboard");
    },
  );
});

describe("sanitizeSearch (PostgREST filter safety)", () => {
  it("removes filter operator characters", () => {
    expect(sanitizeSearch("milk,name.eq.x)*%:'\"")).toBe("milk name.eq.x");
  });
  it("collapses whitespace and limits length", () => {
    expect(sanitizeSearch("  oat    milk  ")).toBe("oat milk");
    expect(sanitizeSearch("x".repeat(200))).toHaveLength(80);
  });
});

describe("type guards", () => {
  it("isUuid", () => {
    expect(isUuid("9f594958-4efa-4546-b61f-08b9fbed09d4")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(42)).toBe(false);
  });
  it("roles and statuses come only from the database enums", () => {
    expect(isAppRole("manager")).toBe(true);
    expect(isAppRole("superuser")).toBe(false);
    expect(isAccountStatus("disabled")).toBe(true);
    expect(isAccountStatus("banned")).toBe(false);
  });
});
