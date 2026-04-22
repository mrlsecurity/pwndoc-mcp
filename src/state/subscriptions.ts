import { SUBSCRIPTIONS_FILE, readJsonOrNull, writeSecure } from "./paths.js";

export interface Subscription {
  auditId: string;
  subscribedAt: string;
  lastSeenAt: string;
  events: string[];   // e.g. ["finding_done","new_finding","state_change","new_comment"]
}

interface SubsFile { subscriptions: Subscription[]; }

export function loadSubscriptions(): Subscription[] {
  return readJsonOrNull<SubsFile>(SUBSCRIPTIONS_FILE)?.subscriptions ?? [];
}

export function saveSubscriptions(subs: Subscription[]): void {
  writeSecure(SUBSCRIPTIONS_FILE, JSON.stringify({ subscriptions: subs }, null, 2));
}

export function addSubscription(s: Subscription): Subscription[] {
  const existing = loadSubscriptions().filter(x => x.auditId !== s.auditId);
  existing.push(s);
  saveSubscriptions(existing);
  return existing;
}

export function removeSubscription(auditId: string): Subscription[] {
  const remaining = loadSubscriptions().filter(s => s.auditId !== auditId);
  saveSubscriptions(remaining);
  return remaining;
}

export function updateLastSeen(auditId: string, at: string): void {
  const subs = loadSubscriptions().map(s =>
    s.auditId === auditId ? { ...s, lastSeenAt: at } : s
  );
  saveSubscriptions(subs);
}
