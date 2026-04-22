import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkDeadline } from "../src/lib/deadlines.js";

describe("checkDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("ok when null/undefined", () => {
    expect(checkDeadline(null).level).toBe("ok");
    expect(checkDeadline(undefined).level).toBe("ok");
  });

  it("flags passed deadlines", () => {
    const r = checkDeadline("2026-04-10");
    expect(r.level).toBe("passed");
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it("flags soon (≤3 days)", () => {
    expect(checkDeadline("2026-04-19").level).toBe("soon");
    expect(checkDeadline("2026-04-20").level).toBe("soon");
    expect(checkDeadline("2026-04-21").level).toBe("soon");
  });

  it("ok when far enough out", () => {
    expect(checkDeadline("2026-05-01").level).toBe("ok");
  });

  it("ok on invalid date string", () => {
    expect(checkDeadline("not-a-date").level).toBe("ok");
  });
});
