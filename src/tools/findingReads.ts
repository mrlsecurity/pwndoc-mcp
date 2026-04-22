import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getFinding } from "../api/findings.js";
import { getAudit } from "../api/audits.js";
import { listVulnerabilities } from "../api/vulns.js";
import { requireCurrentAuditId } from "../state/current.js";
import { project } from "../lib/projection.js";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

export const findingReadTools: ToolDef[] = [
  {
    name: "get_finding",
    description: "Return a single finding. Use 'fields' to project only specific fields and reduce token usage.",
    inputSchema: {
      type: "object",
      properties: {
        findingId: { type: "string" },
        auditId: { type: "string" },
        fields: { type: "array", items: { type: "string" } },
      },
      required: ["findingId"],
    },
    handler: async ({ findingId, auditId, fields }) => {
      const id = resolveAuditId(auditId);
      const f = await getFinding(id, findingId);
      return jsonOut(project(f, fields));
    },
  },
  {
    name: "get_finding_field",
    description: "Return a single field's value from a finding. Cheapest read.",
    inputSchema: {
      type: "object",
      properties: {
        findingId: { type: "string" },
        field: { type: "string" },
        auditId: { type: "string" },
      },
      required: ["findingId", "field"],
    },
    handler: async ({ findingId, field, auditId }) => {
      const id = resolveAuditId(auditId);
      const f = await getFinding(id, findingId);
      return jsonOut({ [field]: f[field] });
    },
  },
  {
    name: "search_findings",
    description: "Substring search over finding titles + descriptions. Scope: 'audit' (current audit) or 'library' (vuln library).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        scope: { type: "string", enum: ["audit", "library"], default: "audit" },
        auditId: { type: "string" },
        limit: { type: "number", default: 25 },
      },
      required: ["query"],
    },
    handler: async ({ query, scope = "audit", auditId, limit = 25 }) => {
      const q = query.toLowerCase();
      let results: any[] = [];
      if (scope === "audit") {
        const id = resolveAuditId(auditId);
        const a = await getAudit(id);
        results = (a.findings || []).filter((f: any) =>
          (f.title || "").toLowerCase().includes(q) ||
          (f.description || "").toLowerCase().includes(q)
        ).map((f: any) => ({ _id: f._id, identifier: f.identifier, title: f.title, status: f.status }));
      } else {
        const vulns = await listVulnerabilities();
        results = vulns.filter((v: any) => {
          const text = JSON.stringify(v.details || []).toLowerCase();
          return text.includes(q);
        }).map((v: any) => ({
          _id: v._id,
          title: v.details?.[0]?.title,
          category: v.category,
          vulnType: v.details?.[0]?.vulnType,
        }));
      }
      results = results.slice(0, limit);
      return jsonOut({ count: results.length, results });
    },
  },
  {
    name: "list_vuln_library",
    description: "List entries in the shared vulnerability library. Returns slim summaries.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string" },
        language: { type: "string" },
        query: { type: "string" },
        limit: { type: "number", default: 50 },
      },
    },
    handler: async ({ category, language, query, limit = 50 }) => {
      let vulns = await listVulnerabilities();
      if (category) vulns = vulns.filter((v: any) => v.category === category);
      const q = query?.toLowerCase();
      const slim = vulns.map((v: any) => {
        const detail = language
          ? (v.details || []).find((d: any) => d.locale === language)
          : (v.details || [])[0];
        return {
          _id: v._id,
          category: v.category,
          status: v.status,
          title: detail?.title,
          vulnType: detail?.vulnType,
          locale: detail?.locale,
          priority: v.priority,
        };
      }).filter((v: any) => !q || (v.title || "").toLowerCase().includes(q))
        .slice(0, limit);
      return jsonOut({ count: slim.length, vulns: slim });
    },
  },
];
