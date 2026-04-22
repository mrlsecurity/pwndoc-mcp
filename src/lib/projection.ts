export function project<T extends Record<string, any>>(obj: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) return obj;
  const out: Partial<T> = {};
  for (const f of fields) {
    if (f in obj) (out as any)[f] = obj[f];
  }
  return out;
}

export function projectMany<T extends Record<string, any>>(arr: T[], fields?: string[]): Partial<T>[] {
  return arr.map(o => project(o, fields));
}

export const DEFAULT_FINDING_FIELDS = ["_id", "identifier", "title", "status", "vulnType", "priority", "category"];
export const DEFAULT_AUDIT_FIELDS = ["_id", "name", "auditType", "state", "date_start", "date_end", "company", "client"];
