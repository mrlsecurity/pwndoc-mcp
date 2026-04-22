import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getAudit, listAudits, toggleApproval, updateReadyForReview } from "../api/audits.js";
import { getMe } from "../api/users.js";
import { requireCurrentAuditId } from "../state/current.js";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

export const approvalTools: ToolDef[] = [
  {
    name: "submit_audit_for_review",
    description: "Move audit from EDIT to REVIEW (or back to EDIT). Locks finding edits while in REVIEW.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        targetState: { type: "string", enum: ["EDIT", "REVIEW"], default: "REVIEW" },
      },
    },
    handler: async ({ auditId, targetState = "REVIEW" }) => {
      const id = resolveAuditId(auditId);
      const r = await updateReadyForReview(id, targetState);
      return jsonOut({ ok: true, auditId: id, state: targetState, result: r });
    },
  },
  {
    name: "approve_audit",
    description: "Toggle the current user's approval on an audit (must be in REVIEW state and user must be a reviewer).",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
    },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const r = await toggleApproval(id);
      return jsonOut({ ok: true, auditId: id, result: r });
    },
  },
  {
    name: "list_pending_reviews",
    description: "List audits in REVIEW state where the current user is a reviewer and has not yet approved.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const me = await getMe();
      const all = await listAudits();
      const pending: any[] = [];
      for (const a of all) {
        if (a.state !== "REVIEW") continue;
        // Need full audit to see reviewers/approvals
        const full = await getAudit(a._id);
        const isReviewer = (full.reviewers || []).some((u: any) => String(u._id ?? u) === me._id);
        const hasApproved = (full.approvals || []).some((u: any) => String(u._id ?? u) === me._id);
        if (isReviewer && !hasApproved) {
          pending.push({ _id: full._id, name: full.name, date_end: full.date_end, approvalsCount: (full.approvals || []).length });
        }
      }
      return jsonOut({ count: pending.length, pending });
    },
  },
];
