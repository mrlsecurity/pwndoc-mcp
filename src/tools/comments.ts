import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getAudit } from "../api/audits.js";
import { createComment, deleteComment } from "../api/comments.js";
import { getMe } from "../api/users.js";
import { requireCurrentAuditId } from "../state/current.js";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

function flattenComments(audit: any): any[] {
  return (audit.comments || []).map((c: any) => ({
    _id: c._id,
    findingId: c.findingId,
    sectionId: c.sectionId,
    fieldName: c.fieldName,
    author: c.author && (typeof c.author === "object" ? `${c.author.firstname || ""} ${c.author.lastname || ""}`.trim() || c.author.username : c.author),
    text: c.text,
    resolved: c.resolved,
    needsWork: c.needsWork,
    repliesCount: (c.replies || []).length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export const commentTools: ToolDef[] = [
  {
    name: "list_comments",
    description: "List all comments in the audit, optionally filtered by findingId. Returns slim entries (text + metadata, not replies).",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        findingId: { type: "string" },
      },
    },
    handler: async ({ auditId, findingId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      let comments = flattenComments(a);
      if (findingId) comments = comments.filter(c => String(c.findingId) === findingId);
      return jsonOut({ count: comments.length, comments });
    },
  },
  {
    name: "get_comment",
    description: "Return one comment with its full text and replies.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        commentId: { type: "string" },
      },
      required: ["commentId"],
    },
    handler: async ({ auditId, commentId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      const c = (a.comments || []).find((x: any) => String(x._id) === commentId);
      if (!c) return `Comment ${commentId} not found in audit ${id}.`;
      return jsonOut(c);
    },
  },
  {
    name: "create_comment",
    description: "Create a comment on a finding (optionally anchored to a specific field via fieldName). For sub-field anchoring, quote the target snippet inside the comment text.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        findingId: { type: "string" },
        fieldName: { type: "string", description: "Field anchor (e.g. 'description', 'remediation'). Empty string for finding-level." },
        text: { type: "string" },
      },
      required: ["findingId", "text"],
    },
    handler: async ({ auditId, findingId, fieldName, text }) => {
      const id = resolveAuditId(auditId);
      const me = await getMe();
      const r = await createComment(id, {
        findingId,
        fieldName: fieldName || "",
        authorId: me._id,
        text,
      });
      return jsonOut(r);
    },
  },
  {
    name: "delete_comment",
    description: "Delete a comment by ID. Permission-gated server-side: typically only own comments unless 'audits:comments:delete-all' role.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        commentId: { type: "string" },
      },
      required: ["commentId"],
    },
    handler: async ({ auditId, commentId }) => {
      const id = resolveAuditId(auditId);
      const r = await deleteComment(id, commentId);
      return jsonOut({ ok: true, commentId, result: r });
    },
  },
  {
    name: "list_unresolved_comments",
    description: "List comments where resolved=false (still need attention). Useful for review pass.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
    },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      const comments = flattenComments(a).filter(c => !c.resolved);
      return jsonOut({ count: comments.length, comments });
    },
  },
];
