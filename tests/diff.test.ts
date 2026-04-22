import { describe, it, expect } from "vitest";
import { diffSnapshots, formatDiff } from "../src/lib/diff.js";
import type { AuditSnapshot } from "../src/state/snapshots.js";

const baseSnap = (overrides: Partial<AuditSnapshot> = {}): AuditSnapshot => ({
  auditId: "a1",
  capturedAt: "2026-04-01T00:00:00Z",
  state: "EDIT",
  dateEnd: "2027-01-01",
  findings: [
    { id: "f1", title: "SQLi", status: 1, updatedAt: "2026-03-01" },
    { id: "f2", title: "XSS", status: 1, updatedAt: "2026-03-01" },
  ],
  counts: { total: 2, done: 0, redacting: 2 },
  ...overrides,
});

describe("diffSnapshots", () => {
  it("detects no changes", () => {
    const prev = baseSnap();
    const next = baseSnap({ capturedAt: "2026-04-02T00:00:00Z" });
    const d = diffSnapshots(prev, next);
    expect(d.added).toHaveLength(0);
    expect(d.removed).toHaveLength(0);
    expect(d.statusChanges).toHaveLength(0);
    expect(d.titleChanges).toHaveLength(0);
    expect(d.stateChange).toBeNull();
  });

  it("detects added findings", () => {
    const prev = baseSnap();
    const next = baseSnap({
      findings: [
        ...prev.findings,
        { id: "f3", title: "Open redirect", status: 1, updatedAt: "2026-04-02" },
      ],
      counts: { total: 3, done: 0, redacting: 3 },
    });
    const d = diffSnapshots(prev, next);
    expect(d.added).toEqual([{ id: "f3", title: "Open redirect" }]);
  });

  it("detects removed findings", () => {
    const prev = baseSnap();
    const next = baseSnap({
      findings: [{ id: "f1", title: "SQLi", status: 1, updatedAt: "2026-03-01" }],
      counts: { total: 1, done: 0, redacting: 1 },
    });
    const d = diffSnapshots(prev, next);
    expect(d.removed).toEqual([{ id: "f2", title: "XSS" }]);
  });

  it("detects status changes", () => {
    const prev = baseSnap();
    const next = baseSnap({
      findings: [
        { id: "f1", title: "SQLi", status: 0, updatedAt: "2026-04-02" },
        { id: "f2", title: "XSS", status: 1, updatedAt: "2026-03-01" },
      ],
      counts: { total: 2, done: 1, redacting: 1 },
    });
    const d = diffSnapshots(prev, next);
    expect(d.statusChanges).toEqual([{ id: "f1", title: "SQLi", from: 1, to: 0 }]);
  });

  it("detects title changes", () => {
    const prev = baseSnap();
    const next = baseSnap({
      findings: [
        { id: "f1", title: "SQL Injection", status: 1, updatedAt: "2026-04-02" },
        { id: "f2", title: "XSS", status: 1, updatedAt: "2026-03-01" },
      ],
    });
    const d = diffSnapshots(prev, next);
    expect(d.titleChanges).toEqual([{ id: "f1", from: "SQLi", to: "SQL Injection" }]);
  });

  it("detects state transitions", () => {
    const prev = baseSnap();
    const next = baseSnap({ state: "REVIEW" });
    const d = diffSnapshots(prev, next);
    expect(d.stateChange).toEqual({ from: "EDIT", to: "REVIEW" });
  });

  it("formats human-readable diff", () => {
    const prev = baseSnap();
    const next = baseSnap({
      state: "REVIEW",
      findings: [
        { id: "f1", title: "SQLi", status: 0, updatedAt: "2026-04-02" },
        { id: "f3", title: "CSRF", status: 1, updatedAt: "2026-04-02" },
      ],
      counts: { total: 2, done: 1, redacting: 1 },
    });
    const out = formatDiff(diffSnapshots(prev, next));
    expect(out).toContain("EDIT → REVIEW");
    expect(out).toContain("CSRF");
    expect(out).toContain("redacting → done");
  });
});
