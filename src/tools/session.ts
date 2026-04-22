import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getMe } from "../api/users.js";
import { loadConfig } from "../config.js";

export const sessionTools: ToolDef[] = [
  {
    name: "pwndoc_whoami",
    description:
      "Verify the configured PWNDOC_API_KEY and return the currently authenticated PwnDoc user (username, id, roles).",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const cfg = loadConfig();
      try {
        const me = await getMe(true);
        return jsonOut({
          username: me.username,
          _id: me._id,
          roles: me.roles ?? [me.role],
          email: me.email,
          serverUrl: cfg.pwndocUrl,
        });
      } catch (e: any) {
        return (
          `API key check failed: ${e?.message ?? e}\n` +
          "Fix: in PwnDoc, open Profile → API keys, create a new key, and set " +
          "PWNDOC_API_KEY to the one-time 'pwndoc_<…>' value in your MCP client config."
        );
      }
    },
  },
];
