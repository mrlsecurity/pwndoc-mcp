import { describe, it, expect } from "vitest";
import { buildSnapshot } from "../src/state/snapshots.js";

describe("buildSnapshot", () => {
  it("builds a slim snapshot from raw audit JSON", () => {
    const audit = {
      _id: "a1",
      state: "EDIT",
      date_end: "2026-12-31",
      findings: [
        { _id: "f1", title: "A", status: 0, updatedAt: "2026-04-01", description: "should not be stored", poc: "huge" },
        { _id: "f2", title: "B", status: 1, updatedAt: "2026-04-02" },
        { _id: "f3", title: "C" /* missing status defaults to 1 */ },
      ],
    };
    const s = buildSnapshot(audit);
    expect(s.auditId).toBe("a1");
    expect(s.state).toBe("EDIT");
    expect(s.dateEnd).toBe("2026-12-31");
    expect(s.findings).toHaveLength(3);
    expect(s.findings[0]).not.toHaveProperty("description");
    expect(s.findings[0]).not.toHaveProperty("poc");
    expect(s.findings[2].status).toBe(1);
    expect(s.counts).toEqual({ total: 3, done: 1, redacting: 2 });
  });
});
