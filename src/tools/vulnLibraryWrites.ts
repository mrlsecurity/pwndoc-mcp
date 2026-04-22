import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { createVulnerability, updateVulnerability, deleteVulnerability } from "../api/vulns.js";
import { getFinding } from "../api/findings.js";
import { requireConfirm } from "../lib/confirm.js";
import { getCurrentAuditId } from "../state/current.js";

export const vulnLibraryWriteTools: ToolDef[] = [
  {
    name: "create_vuln_library_entry",
    description:
      "Create a new entry in the shared vulnerability library. `details` is a localized array — each element must have {locale, title} and may include description/observation/remediation/references/vulnType/customFields.",
    inputSchema: {
      type: "object",
      properties: {
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              locale: { type: "string" },
              title: { type: "string" },
              vulnType: { type: "string" },
              description: { type: "string" },
              observation: { type: "string" },
              remediation: { type: "string" },
              references: { type: "array", items: { type: "string" } },
              customFields: { type: "array", items: { type: "object" } },
            },
            required: ["locale", "title"],
          },
        },
        category: { type: "string" },
        cvssv3: { type: "string", description: "CVSS v3 vector string." },
        cvssv4: { type: "string", description: "CVSS v4 vector string." },
        priority: { type: "number" },
        remediationComplexity: { type: "number" },
      },
      required: ["details"],
    },
    handler: async (args) => {
      const r = await createVulnerability(args);
      return jsonOut(r);
    },
  },
  {
    name: "update_vuln_library_entry",
    description:
      "Update a library entry. Backend requires the full `details` array on PUT — pass the complete localized set (fetch the existing entry first if you only want to patch one locale).",
    inputSchema: {
      type: "object",
      properties: {
        vulnerabilityId: { type: "string" },
        details: { type: "array", items: { type: "object" } },
        category: { type: "string" },
        cvssv3: { type: "string" },
        cvssv4: { type: "string" },
        priority: { type: "number" },
        remediationComplexity: { type: "number" },
      },
      required: ["vulnerabilityId", "details"],
    },
    handler: async ({ vulnerabilityId, ...rest }) => {
      const r = await updateVulnerability(vulnerabilityId, rest);
      return jsonOut(r);
    },
  },
  {
    name: "delete_vuln_library_entry",
    description: "Delete a vulnerability library entry. Requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: {
        vulnerabilityId: { type: "string" },
        confirm: { type: "boolean" },
      },
      required: ["vulnerabilityId", "confirm"],
    },
    handler: async (args) => {
      requireConfirm(args, "delete_vuln_library_entry");
      const r = await deleteVulnerability(args.vulnerabilityId);
      return jsonOut({ ok: true, deletedId: args.vulnerabilityId, backend: r });
    },
  },
  {
    name: "promote_finding_to_library",
    description:
      "Convenience: read a finding from the current (or specified) audit and create a library entry from it. Strips audit-scoped fields (status, assignee, POC screenshots) and keeps the reusable core (title, description, observation, remediation, references, CVSS, category, vulnType).",
    inputSchema: {
      type: "object",
      properties: {
        findingId: { type: "string" },
        auditId: { type: "string", description: "Defaults to current audit." },
        locale: { type: "string", description: "Locale tag for the library detail entry. Default 'en'." },
        category: { type: "string", description: "Overrides the finding's category if provided." },
      },
      required: ["findingId"],
    },
    handler: async (args) => {
      const auditId = args.auditId ?? getCurrentAuditId();
      if (!auditId) throw new Error("No audit specified and no current audit set. Use set_current_audit first.");
      const f = await getFinding(auditId, args.findingId);
      const locale = args.locale ?? "en";
      const detail: any = {
        locale,
        title: f.title,
        vulnType: f.vulnType,
        description: f.description,
        observation: f.observation,
        remediation: f.remediation,
        references: f.references ?? [],
        customFields: f.customFields ?? [],
      };
      const payload: any = {
        details: [detail],
        category: args.category ?? f.category,
        cvssv3: f.cvssv3,
        cvssv4: f.cvssv4,
        priority: f.priority,
        remediationComplexity: f.remediationComplexity,
      };
      // Drop undefined so backend uses its own defaults.
      for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
      const r = await createVulnerability(payload);
      return jsonOut({ ok: true, sourceFindingId: args.findingId, created: r });
    },
  },
];
