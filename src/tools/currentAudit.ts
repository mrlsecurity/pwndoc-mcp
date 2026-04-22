import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getCurrentAuditId, setCurrentAuditId } from "../state/current.js";
import { listAudits } from "../api/audits.js";
import { project, DEFAULT_AUDIT_FIELDS } from "../lib/projection.js";
import { checkDeadline } from "../lib/deadlines.js";

export const currentAuditTools: ToolDef[] = [
  {
    name: "set_current_audit",
    description: "Set the audit ID used as default by other tools when auditId is omitted.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
      required: ["auditId"],
    },
    handler: async ({ auditId }) => {
      setCurrentAuditId(auditId);
      return `Current audit set to ${auditId}.`;
    },
  },
  {
    name: "get_current_audit",
    description: "Return the currently selected audit ID (or null).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => jsonOut({ auditId: getCurrentAuditId() }),
  },
  {
    name: "list_my_audits",
    description: "List audits visible to the current user. Returns slim summaries with deadline warnings.",
    inputSchema: {
      type: "object",
      properties: {
        state: { type: "string", enum: ["EDIT", "REVIEW", "APPROVED"], description: "Filter by audit state" },
        fields: { type: "array", items: { type: "string" }, description: "Field projection; default returns slim summary" },
      },
    },
    handler: async ({ state, fields }) => {
      let audits = await listAudits();
      if (state) audits = audits.filter((a: any) => a.state === state);
      const slim = audits.map((a: any) => {
        const base = project(a, fields ?? DEFAULT_AUDIT_FIELDS);
        const dl = checkDeadline(a.date_end);
        return { ...base, deadline: dl.message, deadlineLevel: dl.level };
      });
      return jsonOut({ count: slim.length, audits: slim });
    },
  },
];
