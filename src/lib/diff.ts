import type { AuditSnapshot, FindingSnap } from "../state/snapshots.js";
import { checkDeadline } from "./deadlines.js";

export interface DiffResult {
  auditId: string;
  since: string;
  added: { id: string; title: string }[];
  removed: { id: string; title: string }[];
  statusChanges: { id: string; title: string; from: number; to: number }[];
  titleChanges: { id: string; from: string; to: string }[];
  stateChange: { from: string; to: string } | null;
  deadlineWarning: ReturnType<typeof checkDeadline>;
  countsBefore: AuditSnapshot["counts"];
  countsAfter: AuditSnapshot["counts"];
}

export function diffSnapshots(prev: AuditSnapshot, next: AuditSnapshot): DiffResult {
  const prevMap = new Map<string, FindingSnap>(prev.findings.map(f => [f.id, f]));
  const nextMap = new Map<string, FindingSnap>(next.findings.map(f => [f.id, f]));

  const added: { id: string; title: string }[] = [];
  const removed: { id: string; title: string }[] = [];
  const statusChanges: DiffResult["statusChanges"] = [];
  const titleChanges: DiffResult["titleChanges"] = [];

  for (const [id, f] of nextMap) {
    const old = prevMap.get(id);
    if (!old) { added.push({ id, title: f.title }); continue; }
    if (old.status !== f.status) statusChanges.push({ id, title: f.title, from: old.status, to: f.status });
    if (old.title !== f.title) titleChanges.push({ id, from: old.title, to: f.title });
  }
  for (const [id, f] of prevMap) {
    if (!nextMap.has(id)) removed.push({ id, title: f.title });
  }

  return {
    auditId: next.auditId,
    since: prev.capturedAt,
    added,
    removed,
    statusChanges,
    titleChanges,
    stateChange: prev.state !== next.state ? { from: prev.state, to: next.state } : null,
    deadlineWarning: checkDeadline(next.dateEnd),
    countsBefore: prev.counts,
    countsAfter: next.counts,
  };
}

export function formatDiff(d: DiffResult): string {
  const lines: string[] = [`Audit ${d.auditId} — changes since ${d.since}`];
  if (d.stateChange) lines.push(`  state: ${d.stateChange.from} → ${d.stateChange.to}`);
  if (d.added.length) {
    lines.push(`  + ${d.added.length} new finding(s):`);
    for (const a of d.added) lines.push(`    - "${a.title}"`);
  }
  if (d.removed.length) {
    lines.push(`  - ${d.removed.length} removed:`);
    for (const r of d.removed) lines.push(`    - "${r.title}"`);
  }
  if (d.statusChanges.length) {
    lines.push(`  ~ ${d.statusChanges.length} status change(s):`);
    for (const s of d.statusChanges) {
      const fromStr = s.from === 0 ? "done" : "redacting";
      const toStr = s.to === 0 ? "done" : "redacting";
      lines.push(`    - "${s.title}" ${fromStr} → ${toStr}`);
    }
  }
  if (d.titleChanges.length) {
    lines.push(`  ~ ${d.titleChanges.length} title change(s):`);
    for (const t of d.titleChanges) lines.push(`    - "${t.from}" → "${t.to}"`);
  }
  if (!d.added.length && !d.removed.length && !d.statusChanges.length && !d.titleChanges.length && !d.stateChange) {
    lines.push("  (no changes)");
  }
  if (d.deadlineWarning.level !== "ok") lines.push(`  ⚠ ${d.deadlineWarning.message}`);
  lines.push(`  counts: ${d.countsBefore.done}/${d.countsBefore.total} → ${d.countsAfter.done}/${d.countsAfter.total} done`);
  return lines.join("\n");
}
