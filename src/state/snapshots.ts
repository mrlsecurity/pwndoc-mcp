import path from "node:path";
import fs from "node:fs";
import { SNAPSHOT_DIR, writeSecure, readJsonOrNull } from "./paths.js";

export interface FindingSnap {
  id: string;
  title: string;
  status: number;          // 0=done, 1=redacting
  updatedAt: string;
}

export interface AuditSnapshot {
  auditId: string;
  capturedAt: string;
  state: string;
  dateEnd: string | null;
  findings: FindingSnap[];
  counts: { total: number; done: number; redacting: number };
}

function snapPath(auditId: string): string {
  return path.join(SNAPSHOT_DIR, `${auditId}.json`);
}

export function loadSnapshot(auditId: string): AuditSnapshot | null {
  return readJsonOrNull<AuditSnapshot>(snapPath(auditId));
}

export function saveSnapshot(snap: AuditSnapshot): void {
  writeSecure(snapPath(snap.auditId), JSON.stringify(snap));
}

export function deleteSnapshot(auditId: string): void {
  try { fs.unlinkSync(snapPath(auditId)); } catch { /* noop */ }
}

export function buildSnapshot(audit: any): AuditSnapshot {
  const findings = (audit.findings || []).map((f: any) => ({
    id: String(f._id ?? f.id),
    title: f.title ?? "",
    status: typeof f.status === "number" ? f.status : 1,
    updatedAt: f.updatedAt ?? f.createdAt ?? "",
  }));
  const done = findings.filter((f: FindingSnap) => f.status === 0).length;
  return {
    auditId: String(audit._id ?? audit.id),
    capturedAt: new Date().toISOString(),
    state: audit.state ?? "EDIT",
    dateEnd: audit.date_end ?? null,
    findings,
    counts: { total: findings.length, done, redacting: findings.length - done },
  };
}
