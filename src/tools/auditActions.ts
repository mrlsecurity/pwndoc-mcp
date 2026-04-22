import path from "node:path";
import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import {
  createAudit,
  deleteAudit,
  updateAuditNetwork,
  updateAuditSection,
  getAuditSections,
  generateAuditReportBinary,
} from "../api/audits.js";
import { requireConfirm } from "../lib/confirm.js";
import { writeBinary, ensureSubdir } from "../lib/binary-io.js";
import { STATE_DIR_FN } from "../state/paths.js";

export const auditActionTools: ToolDef[] = [
  {
    name: "create_audit",
    description:
      "Create a new audit on PwnDoc. Returns the new audit's id and stub metadata. Use set_current_audit to make it the working audit.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        auditType: { type: "string", description: "A configured audit-type name (see backend data types)." },
        language: { type: "string", description: "Locale code, e.g. 'en' or 'fr'." },
        type: { type: "string", enum: ["default", "multi"], description: "Default 'default'. Use 'multi' only if your instance uses it." },
        parentId: { type: "string", description: "Parent audit ID — only for retest/multi child audits." },
      },
      required: ["name", "auditType", "language"],
    },
    handler: async (args) => {
      const created = await createAudit({
        name: args.name,
        language: args.language,
        auditType: args.auditType,
        type: args.type,
        ...(args.parentId ? { parentId: args.parentId } : {}),
      } as any);
      return jsonOut(created);
    },
  },
  {
    name: "delete_audit",
    description:
      "Delete an audit and all of its findings. Requires confirm:true. Irreversible; collaborators will see it disappear.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        confirm: { type: "boolean", description: "Must be true to proceed." },
      },
      required: ["auditId", "confirm"],
    },
    handler: async (args) => {
      requireConfirm(args, "delete_audit");
      const res = await deleteAudit(args.auditId);
      return jsonOut({ ok: true, deletedAuditId: args.auditId, backend: res });
    },
  },
  {
    name: "update_audit_network",
    description:
      "Overwrite the audit's scope/network block. `scope` is an array of scope items (hosts, URLs, etc.) matching the backend schema — pass the full new list; this is a PUT, not a patch.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        scope: { type: "array", items: { type: "object" } },
      },
      required: ["auditId", "scope"],
    },
    handler: async (args) => {
      const r = await updateAuditNetwork(args.auditId, args.scope);
      return jsonOut(r);
    },
  },
  {
    name: "list_audit_sections",
    description: "List the custom sections on an audit (their ids, fields, and current values).",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
      required: ["auditId"],
    },
    handler: async ({ auditId }) => {
      const sections = await getAuditSections(auditId);
      return jsonOut(sections.map((s: any) => ({ _id: s._id, name: s.name, field: s.field, customFieldsCount: (s.customFields ?? []).length })));
    },
  },
  {
    name: "update_audit_section",
    description:
      "Write a custom-field payload to a specific audit section. `customFields` replaces the section's customFields array entirely; `text` is an optional legacy body.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        sectionId: { type: "string" },
        customFields: { type: "array", items: { type: "object" } },
        text: { type: "string" },
      },
      required: ["auditId", "sectionId", "customFields"],
    },
    handler: async (args) => {
      const r = await updateAuditSection(args.auditId, args.sectionId, args.customFields, args.text);
      return jsonOut(r);
    },
  },
  {
    name: "generate_audit_report",
    description:
      "Trigger DOCX report generation on the backend and save the binary to local disk. Returns the absolute path. MCP tools can't return binary; use this path with other tooling.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        outputPath: { type: "string", description: "Optional absolute path to write to. Default: <state_dir>/reports/<filename-from-backend>." },
      },
      required: ["auditId"],
    },
    handler: async ({ auditId, outputPath }) => {
      const { bytes, filename } = await generateAuditReportBinary(auditId);
      const reportsDir = ensureSubdir(STATE_DIR_FN(), "reports");
      const target = writeBinary(bytes, outputPath, reportsDir, filename);
      return jsonOut({ ok: true, path: target, bytes: bytes.length, filename });
    },
  },
];
