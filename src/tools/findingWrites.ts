import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { createFinding, updateFinding, getFinding } from "../api/findings.js";
import { getVulnerability } from "../api/vulns.js";
import { getAudit } from "../api/audits.js";
import { requireCurrentAuditId } from "../state/current.js";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

const ALLOWED_FINDING_FIELDS = new Set([
  "title", "vulnType", "description", "observation", "remediation", "references",
  "cvssv3", "cvssv4", "priority", "remediationComplexity", "category", "scope",
  "poc", "paragraphs", "customFields", "status", "retestStatus", "retestDescription",
]);

export const findingWriteTools: ToolDef[] = [
  {
    name: "create_finding",
    description: "Create a new finding in the audit. Only 'title' is required; other fields optional.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        title: { type: "string" },
        vulnType: { type: "string" },
        description: { type: "string" },
        observation: { type: "string" },
        remediation: { type: "string" },
        references: { type: "array", items: { type: "string" } },
        cvssv3: { type: "string" },
        cvssv4: { type: "string" },
        priority: { type: "number" },
        remediationComplexity: { type: "number" },
        category: { type: "string" },
        scope: { type: "string" },
        poc: { type: "string" },
      },
      required: ["title"],
    },
    handler: async ({ auditId, ...finding }) => {
      const id = resolveAuditId(auditId);
      const r = await createFinding(id, finding);
      return jsonOut(r);
    },
  },
  {
    name: "update_finding_field",
    description: "Update a single field on a finding. Use this for granular edits to keep diffs surgical.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        findingId: { type: "string" },
        field: { type: "string" },
        value: {},
      },
      required: ["findingId", "field", "value"],
    },
    handler: async ({ auditId, findingId, field, value }) => {
      if (!ALLOWED_FINDING_FIELDS.has(field)) {
        return `Field "${field}" is not in the allowed update set: ${[...ALLOWED_FINDING_FIELDS].join(", ")}`;
      }
      const id = resolveAuditId(auditId);
      // Backend PUT replaces fields supplied; we fetch current finding, mutate, send back.
      const current = await getFinding(id, findingId);
      const updated = { ...current, [field]: value };
      const r = await updateFinding(id, findingId, updated);
      return jsonOut({ ok: true, field, result: r });
    },
  },
  {
    name: "import_finding_from_library",
    description: "Create a finding by copying an entry from the vulnerability library into the current audit.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        vulnId: { type: "string" },
        language: { type: "string", description: "Locale to copy (defaults to audit language)" },
      },
      required: ["vulnId"],
    },
    handler: async ({ auditId, vulnId, language }) => {
      const id = resolveAuditId(auditId);
      const audit = await getAudit(id);
      const vuln = await getVulnerability(vulnId);
      const lang = language || audit.language;
      const detail = (vuln.details || []).find((d: any) => d.locale === lang) || vuln.details?.[0];
      if (!detail) return `Vuln ${vulnId} has no usable detail entry.`;
      const finding = {
        title: detail.title,
        vulnType: detail.vulnType,
        description: detail.description,
        observation: detail.observation,
        remediation: detail.remediation,
        references: detail.references || [],
        customFields: detail.customFields || [],
        cvssv3: vuln.cvssv3,
        cvssv4: vuln.cvssv4,
        priority: vuln.priority,
        remediationComplexity: vuln.remediationComplexity,
        category: vuln.category,
      };
      const r = await createFinding(id, finding);
      return jsonOut(r);
    },
  },
  {
    name: "validate_finding",
    description: "Run sanity checks on a finding (required fields populated, CVSS present if applicable). Advisory output only — does not write.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        findingId: { type: "string" },
      },
      required: ["findingId"],
    },
    handler: async ({ auditId, findingId }) => {
      const id = resolveAuditId(auditId);
      const f = await getFinding(id, findingId);
      const issues: string[] = [];
      if (!f.title?.trim()) issues.push("title is empty");
      if (!f.description?.trim()) issues.push("description is empty");
      if (!f.remediation?.trim()) issues.push("remediation is empty");
      if (!f.cvssv3 && !f.cvssv4) issues.push("no CVSS vector set (v3 or v4)");
      if (!f.vulnType) issues.push("vulnType not set");
      if (!f.category) issues.push("category not set");
      return jsonOut({ findingId, ok: issues.length === 0, issues });
    },
  },
  {
    name: "set_finding_status",
    description: "Toggle a finding between 'done' (status=0) and 'redacting' (status=1).",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        findingId: { type: "string" },
        status: { type: "string", enum: ["done", "redacting"] },
      },
      required: ["findingId", "status"],
    },
    handler: async ({ auditId, findingId, status }) => {
      const id = resolveAuditId(auditId);
      const current = await getFinding(id, findingId);
      const value = status === "done" ? 0 : 1;
      const r = await updateFinding(id, findingId, { ...current, status: value });
      return jsonOut({ ok: true, findingId, status, result: r });
    },
  },
];
