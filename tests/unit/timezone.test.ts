import { afterEach, describe, expect, it, vi } from "vitest";

/** lib/timezone reads CAFE_TIME_ZONE when it loads, so re-import per zone. */
async function load(zone: string) {
  vi.stubEnv("CAFE_TIME_ZONE", zone);
  vi.resetModules();
  return import("@/lib/timezone");
}

afterEach(() => vi.unstubAllEnvs());

describe("café day boundaries", () => {
  it.each([
    ["UTC", "2026-11-19", "2026-11-19T00:00:00.000Z", "2026-11-20T00:00:00.000Z"],
    ["Asia/Manila", "2026-11-19", "2026-11-18T16:00:00.000Z", "2026-11-19T16:00:00.000Z"],
    ["America/New_York", "2026-03-08", "2026-03-08T05:00:00.000Z", "2026-03-09T04:00:00.000Z"], // DST starts
    ["America/New_York", "2026-11-01", "2026-11-01T04:00:00.000Z", "2026-11-02T05:00:00.000Z"], // DST ends
    ["Europe/Berlin", "2026-12-31", "2026-12-30T23:00:00.000Z", "2026-12-31T23:00:00.000Z"], // year boundary
  ])("%s %s", async (zone, day, start, next) => {
    const tz = await load(zone);
    expect(tz.startOfCafeDay(day).toISOString()).toBe(start);
    expect(tz.startOfNextCafeDay(day).toISOString()).toBe(next);
  });

  it("todayInCafe uses the café zone, not UTC", async () => {
    const tz = await load("Asia/Manila");
    // 20:00 UTC on 19 Nov is already 04:00 on 20 Nov in Manila.
    expect(tz.todayInCafe(new Date("2026-11-19T20:00:00Z"))).toBe("2026-11-20");
  });

  it("falls back safely for an invalid zone", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const tz = await load("Not/AZone");
    expect(tz.CAFE_TIME_ZONE).not.toBe("Not/AZone");
  });
});
