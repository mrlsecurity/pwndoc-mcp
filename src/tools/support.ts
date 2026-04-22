import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { listClients, getClientById, listCustomFields } from "../api/clients.js";
import { getAudit, getAuditRetest } from "../api/audits.js";
import { listVulnerabilities } from "../api/vulns.js";
import { createFinding, getFinding } from "../api/findings.js";
import { requireCurrentAuditId } from "../state/current.js";
import { loadConfig } from "../config.js";
import { io as ioClient } from "socket.io-client";
import https from "node:https";

function resolveAuditId(arg?: string): string {
  return arg || requireCurrentAuditId();
}

function tokenize(s: string): Set<string> {
  return new Set((s || "").toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3));
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export const supportTools: ToolDef[] = [
  {
    name: "list_clients",
    description: "List clients (people) defined in PwnDoc.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Substring filter on email/name" } },
    },
    handler: async ({ query }) => {
      let clients = await listClients();
      if (query) {
        const q = query.toLowerCase();
        clients = clients.filter((c: any) =>
          (c.email || "").toLowerCase().includes(q) ||
          (c.firstname || "").toLowerCase().includes(q) ||
          (c.lastname || "").toLowerCase().includes(q)
        );
      }
      return jsonOut({ count: clients.length, clients });
    },
  },
  {
    name: "get_client",
    description: "Return one client by ID.",
    inputSchema: {
      type: "object",
      properties: { clientId: { type: "string" } },
      required: ["clientId"],
    },
    handler: async ({ clientId }) => {
      const c = await getClientById(clientId);
      return c ? jsonOut(c) : `Client ${clientId} not found.`;
    },
  },
  {
    name: "get_custom_field_schema",
    description: "Return the custom-field definitions (label, fieldType, display, options) so callers know what extra fields exist on findings/audits.",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string", description: "Filter by display target (e.g. 'finding', 'audit')" } },
    },
    handler: async ({ target }) => {
      let cfs = await listCustomFields();
      if (target) cfs = cfs.filter((f: any) => f.display === target);
      return jsonOut({ count: cfs.length, customFields: cfs });
    },
  },
  {
    name: "draft_finding_from_notes",
    description: "Scaffold a new finding from rough notes. Uses Jaccard similarity against the vuln library to pick the best template, then creates a finding (status=redacting) for the user to refine.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        notes: { type: "string", description: "Rough notes describing the issue" },
        title: { type: "string", description: "Optional explicit title; otherwise inferred from best library match" },
      },
      required: ["notes"],
    },
    handler: async ({ auditId, notes, title }) => {
      const id = resolveAuditId(auditId);
      const audit = await getAudit(id);
      const vulns = await listVulnerabilities();
      const noteTokens = tokenize(notes);
      const lang = audit.language;
      let best: { v: any; detail: any; score: number } | null = null;
      for (const v of vulns) {
        const detail = (v.details || []).find((d: any) => d.locale === lang) || v.details?.[0];
        if (!detail) continue;
        const score = jaccard(noteTokens, tokenize(`${detail.title} ${detail.description} ${detail.observation}`));
        if (!best || score > best.score) best = { v, detail, score };
      }
      const finding: any = {
        title: title || best?.detail?.title || `Untitled (${new Date().toISOString().slice(0, 10)})`,
        description: best && best.score > 0.1 ? `${best.detail.description}\n\n[Notes]\n${notes}` : notes,
        observation: best?.detail?.observation || "",
        remediation: best?.detail?.remediation || "",
        references: best?.detail?.references || [],
        category: best?.v?.category,
        vulnType: best?.detail?.vulnType,
        cvssv3: best?.v?.cvssv3,
        priority: best?.v?.priority,
      };
      const r = await createFinding(id, finding);
      return jsonOut({
        ok: true,
        match: best ? { vulnId: best.v._id, score: Number(best.score.toFixed(3)), title: best.detail.title } : null,
        finding: r,
      });
    },
  },
  {
    name: "diff_findings",
    description: "Diff two findings field-by-field (e.g. retest vs original). Returns which fields changed and short before/after snippets.",
    inputSchema: {
      type: "object",
      properties: {
        auditAId: { type: "string" },
        findingAId: { type: "string" },
        auditBId: { type: "string" },
        findingBId: { type: "string" },
      },
      required: ["findingAId", "findingBId"],
    },
    handler: async ({ auditAId, findingAId, auditBId, findingBId }) => {
      const aId = auditAId || requireCurrentAuditId();
      const bId = auditBId || aId;
      const a = await getFinding(aId, findingAId);
      const b = await getFinding(bId, findingBId);
      const fields = ["title", "description", "observation", "remediation", "cvssv3", "cvssv4", "priority", "status", "category", "vulnType"];
      const changes: any[] = [];
      for (const f of fields) {
        const av = JSON.stringify(a[f] ?? null);
        const bv = JSON.stringify(b[f] ?? null);
        if (av !== bv) {
          changes.push({
            field: f,
            from: av.length > 200 ? av.slice(0, 200) + "…" : av,
            to: bv.length > 200 ? bv.slice(0, 200) + "…" : bv,
          });
        }
      }
      return jsonOut({ a: findingAId, b: findingBId, changedFields: changes.length, changes });
    },
  },
  {
    name: "export_audit_summary",
    description: "Return a compact markdown summary of all findings in an audit (title, status, priority, one-line description). For quick external review.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
    },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const a = await getAudit(id);
      const lines: string[] = [`# ${a.name}`, ``, `State: ${a.state}  •  Type: ${a.auditType}  •  Findings: ${(a.findings || []).length}`, ``];
      const byPrio: Record<string, any[]> = {};
      for (const f of (a.findings || [])) {
        const p = f.priority ?? "—";
        (byPrio[p] = byPrio[p] || []).push(f);
      }
      for (const p of Object.keys(byPrio).sort()) {
        lines.push(`## Priority ${p}`);
        for (const f of byPrio[p]) {
          const status = f.status === 0 ? "✓" : "·";
          const desc = (f.description || "").replace(/\s+/g, " ").slice(0, 120);
          lines.push(`- [${status}] **${f.title}** — ${desc}${desc.length === 120 ? "…" : ""}`);
        }
        lines.push("");
      }
      return lines.join("\n");
    },
  },
  {
    name: "who_is_in_audit",
    description: "Return the list of users currently connected to the audit's collaborative session (via socket.io). Short-lived connection.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
    },
    handler: async ({ auditId }) => {
      const id = resolveAuditId(auditId);
      const cfg = loadConfig();
      const httpsAgent = cfg.insecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;
      return await new Promise<string>((resolve) => {
        const socket = ioClient(cfg.pwndocUrl, {
          transports: ["websocket"],
          rejectUnauthorized: !cfg.insecureTls,
          agent: httpsAgent as any,
          extraHeaders: { Authorization: `Bearer ${cfg.apiKey}` },
          timeout: 5000,
        });
        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve("Timed out waiting for room presence.");
        }, 6000);
        socket.on("connect", () => {
          socket.emit("join", { room: id });
        });
        socket.on("roomUsers", (users: any[]) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve(jsonOut({ auditId: id, users }));
        });
        socket.on("connect_error", (err: any) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve(`socket connect_error: ${err.message}`);
        });
      });
    },
  },
];
