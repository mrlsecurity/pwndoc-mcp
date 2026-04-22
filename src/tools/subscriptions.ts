import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getAudit, listAudits } from "../api/audits.js";
import { getMe } from "../api/users.js";
import { addSubscription, removeSubscription, loadSubscriptions, updateLastSeen } from "../state/subscriptions.js";
import { buildSnapshot, loadSnapshot, saveSnapshot } from "../state/snapshots.js";
import { diffSnapshots, formatDiff } from "../lib/diff.js";
import { checkDeadline } from "../lib/deadlines.js";

const DEFAULT_EVENTS = ["finding_done", "new_finding", "state_change", "new_comment"];

export const subscriptionTools: ToolDef[] = [
  {
    name: "subscribe_audit",
    description: "Subscribe to changes in an audit. Stores a slim snapshot locally; check_subscriptions will diff against it.",
    inputSchema: {
      type: "object",
      properties: {
        auditId: { type: "string" },
        events: { type: "array", items: { type: "string" }, description: "Defaults to all event types" },
      },
      required: ["auditId"],
    },
    handler: async ({ auditId, events }) => {
      const audit = await getAudit(auditId);
      const snap = buildSnapshot({ ...audit, _id: auditId });
      saveSnapshot(snap);
      const now = new Date().toISOString();
      addSubscription({
        auditId,
        subscribedAt: now,
        lastSeenAt: now,
        events: events && events.length ? events : DEFAULT_EVENTS,
      });
      return `Subscribed to audit ${auditId} ("${audit.name}"). Baseline captured (${snap.findings.length} findings).`;
    },
  },
  {
    name: "unsubscribe_audit",
    description: "Stop tracking an audit. Snapshot is retained; subscription is removed.",
    inputSchema: {
      type: "object",
      properties: { auditId: { type: "string" } },
      required: ["auditId"],
    },
    handler: async ({ auditId }) => {
      removeSubscription(auditId);
      return `Unsubscribed from audit ${auditId}.`;
    },
  },
  {
    name: "subscribe_reviewable",
    description: "Auto-subscribe to every audit currently in REVIEW state where the current user is a reviewer.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const me = await getMe();
      const audits = await listAudits();
      const subscribed: string[] = [];
      for (const a of audits) {
        if (a.state !== "REVIEW") continue;
        const full = await getAudit(a._id);
        const isReviewer = (full.reviewers || []).some((u: any) => String(u._id ?? u) === me._id);
        if (!isReviewer) continue;
        const snap = buildSnapshot({ ...full, _id: a._id });
        saveSnapshot(snap);
        const now = new Date().toISOString();
        addSubscription({ auditId: String(a._id), subscribedAt: now, lastSeenAt: now, events: DEFAULT_EVENTS });
        subscribed.push(`${a._id} (${full.name})`);
      }
      return `Subscribed to ${subscribed.length} reviewable audit(s):\n${subscribed.join("\n")}`;
    },
  },
  {
    name: "list_subscriptions",
    description: "List all current audit subscriptions.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => jsonOut({ subscriptions: loadSubscriptions() }),
  },
  {
    name: "check_subscriptions",
    description: "For every subscribed audit, diff current state against the stored snapshot, return human-readable summary, and advance lastSeenAt. This is the 'what's new in pwndoc?' call.",
    inputSchema: {
      type: "object",
      properties: {
        advance: { type: "boolean", default: true, description: "Set false to peek without advancing lastSeenAt" },
      },
    },
    handler: async ({ advance = true }) => {
      const subs = loadSubscriptions();
      if (subs.length === 0) return "No subscriptions. Use subscribe_audit or subscribe_reviewable.";
      const blocks: string[] = [];
      for (const s of subs) {
        try {
          const audit = await getAudit(s.auditId);
          const next = buildSnapshot({ ...audit, _id: s.auditId });
          const prev = loadSnapshot(s.auditId);
          if (!prev) {
            saveSnapshot(next);
            blocks.push(`Audit ${s.auditId} ("${audit.name}"): no prior snapshot, baseline captured.`);
            continue;
          }
          const d = diffSnapshots(prev, next);
          blocks.push(`# ${audit.name} (${s.auditId})\n${formatDiff(d)}`);
          const dl = checkDeadline(audit.date_end);
          if (dl.level !== "ok") blocks.push(`  ⚠ ${dl.message}`);
          if (advance) {
            saveSnapshot(next);
            updateLastSeen(s.auditId, new Date().toISOString());
          }
        } catch (e: any) {
          blocks.push(`Audit ${s.auditId}: error fetching — ${e.message}`);
        }
      }
      return blocks.join("\n\n");
    },
  },
];
