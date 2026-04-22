import os from "node:os";
import path from "node:path";

export interface Config {
  pwndocUrl: string;
  apiKey: string;
  insecureTls: boolean;
  stateDir: string;
}

export function loadConfig(): Config {
  const pwndocUrl = process.env.PWNDOC_URL;
  if (!pwndocUrl) {
    throw new Error("PWNDOC_URL env var is required (e.g. https://pwndoc.company.tld)");
  }
  const apiKey = process.env.PWNDOC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PWNDOC_API_KEY env var is required. Create a key in PwnDoc → Profile → API keys, " +
      "then paste the one-time `pwndoc_<…>` value here."
    );
  }
  if (!/^pwndoc_[0-9a-f]{64}$/.test(apiKey.trim())) {
    throw new Error("PWNDOC_API_KEY has wrong format; expected 'pwndoc_' + 64 hex chars.");
  }
  const stateDir = process.env.PWNDOC_MCP_STATE_DIR || path.join(os.homedir(), ".pwndoc-mcp");
  return {
    pwndocUrl: pwndocUrl.replace(/\/+$/, ""),
    apiKey: apiKey.trim(),
    insecureTls: process.env.PWNDOC_INSECURE_TLS === "1",
    stateDir,
  };
}
