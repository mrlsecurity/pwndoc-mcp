import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getAudit, getAuditGeneral, getAuditNetwork } from "../api/audits.js";
import { requireCurrentAuditId } from "../state/current.js";
import { project, DEFAULT_FINDING_FIELDS } from "../lib/projection.js";
import { checkDeadline } from "../lib/deadlines.js";
import { buildSnapshot, loadSnapshot, saveSnapshot } from "../state/snapshots.js";
import { diffSnapshots, formatDiff } from "../lib/diff.js";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

export const auditReadTools: ToolDef[] = [
  {
    name: "get_audit_meta",
    description: "Return audit metadata (name, dates, client, company, state, counts) with deadline warning. Excludes finding bodies.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
    },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAuditGeneral(id);
      const full = await getAudit(id);
      const findings = full.findings || [];
      const counts = {
        total: findings.length,
        done: findings.filter((f: any) => f.status === 0).length,
        redacting: findings.filter((f: any) => f.status === 1).length,
      };
      const dl = checkDeadline(a.date_end);
      return jsonOut({
        _id: full._id,
        name: a.name,
        auditType: a.auditType,
        language: a.language,
        date: a.date,
        date_start: a.date_start,
        date_end: a.date_end,
        client: a.client,
        company: a.company,
        state: full.state,
        type: full.type,
        creator: a.creator,
        collaborators: a.collaborators,
        reviewers: a.reviewers,
        approvals: full.approvals,
        counts,
        deadline: dl.message,
        deadlineLevel: dl.level,
      });
    },
  },
  {
    name: "get_audit_scope",
    description: "Return the network/scope (hosts, services) of the audit.",
    inputSchema: { type: "object", properties: { auditId: { type: "string" } } },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const n = await getAuditNetwork(id);
      return jsonOut(n);
    },
  },
  {
    name: "list_findings",
    description: "List findings of the audit. Returns slim summaries by default. Use 'fields' to project specific fields. Use 'status' filter (0=done,1=redacting) to narrow.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        status: { type: "number", enum: [0, 1] },
        fields: { type: "array", items: { type: "string" } },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
    handler: async ({ auditId, status, fields, limit, offset }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      let findings: any[] = a.findings || [];
      if (status !== undefined) findings = findings.filter(f => f.status === status);
      const total = findings.length;
      if (offset) findings = findings.slice(offset);
      if (limit) findings = findings.slice(0, limit);
      const slim = findings.map(f => project(f, fields ?? DEFAULT_FINDING_FIELDS));
      return jsonOut({ total, returned: slim.length, findings: slim });
    },
  },
  {
    name: "audit_diff_since",
    description: "Compare the audit's current state with a locally-stored slim snapshot and report what changed (added/removed findings, status changes, state change). Snapshots only store IDs/titles/statuses/timestamps. Set 'capture=true' to refresh the snapshot after diffing.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        capture: { type: "boolean", default: true },
      },
    },
    handler: async ({ auditId, capture = true }) => {
      const id = resolveAuditId(auditId);
      const audit = await getAudit(id);
      const next = buildSnapshot({ ...audit, _id: id });
      const prev = loadSnapshot(id);
      if (!prev) {
        if (capture) saveSnapshot(next);
        return `No prior snapshot for audit ${id}. Captured baseline (${next.findings.length} findings).`;
      }
      const d = diffSnapshots(prev, next);
      if (capture) saveSnapshot(next);
      return formatDiff(d);
    },
  },
  {
    name: "get_audit_approvals",
    description: "Return the list of reviewers and which ones have approved the audit.",
    inputSchema: { type: "object", properties: { auditId: { type: "string" } } },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      return jsonOut({
        state: a.state,
        reviewers: a.reviewers,
        approvals: a.approvals,
        approvalsCount: (a.approvals || []).length,
      });
    },
  },
];
