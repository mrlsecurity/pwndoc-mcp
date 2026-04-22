import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function stateDir(): string {
  return process.env.PWNDOC_MCP_STATE_DIR || path.join(os.homedir(), ".pwndoc-mcp");
}

export const STATE_DIR_FN = stateDir;
export const sessionFile = (): string => path.join(stateDir(), "session.json");
export const currentFile = (): string => path.join(stateDir(), "current.json");
export const subscriptionsFile = (): string => path.join(stateDir(), "subscriptions.json");
export const snapshotDir = (): string => path.join(stateDir(), "snapshots");

// Eager constants for callers that need a constant (must be called after env is set).
export const STATE_DIR = stateDir();
export const SESSION_FILE = sessionFile();
export const CURRENT_FILE = currentFile();
export const SUBSCRIPTIONS_FILE = subscriptionsFile();
export const SNAPSHOT_DIR = snapshotDir();

export function ensureDirs(): void {
  const dir = stateDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  } else if (process.platform !== "win32") {
    try { fs.chmodSync(dir, 0o700); } catch { /* best-effort */ }
  }
  const snaps = snapshotDir();
  if (!fs.existsSync(snaps)) {
    fs.mkdirSync(snaps, { recursive: true, mode: 0o700 });
  }
}

export function writeSecure(filePath: string, contents: string): void {
  ensureDirs();
  fs.writeFileSync(filePath, contents, { mode: 0o600 });
  if (process.platform !== "win32") {
    try { fs.chmodSync(filePath, 0o600); } catch { /* best-effort */ }
  }
}

export function readJsonOrNull<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}
