import { CURRENT_FILE, readJsonOrNull, writeSecure } from "./paths.js";

interface Current { auditId: string | null; }

export function getCurrentAuditId(): string | null {
  return readJsonOrNull<Current>(CURRENT_FILE)?.auditId ?? null;
}

export function setCurrentAuditId(auditId: string | null): void {
  writeSecure(CURRENT_FILE, JSON.stringify({ auditId }));
}

export function requireCurrentAuditId(): string {
  const id = getCurrentAuditId();
  if (!id) throw new Error("No current audit set. Call set_current_audit first.");
  return id;
}
