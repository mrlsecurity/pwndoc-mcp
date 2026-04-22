import { describe, it, expect, vi, beforeEach } from "vitest";

const API_KEY = "pwndoc_" + "a".repeat(64);

beforeEach(() => {
  process.env.PWNDOC_URL = "https://example.test";
  process.env.PWNDOC_API_KEY = API_KEY;
  vi.resetModules();
});

describe("axios client Bearer auth", () => {
  it("attaches Authorization: Bearer <apiKey> on every request", async () => {
    const { getClient } = await import("../src/api/client.js");
    const client = getClient();

    const seen: string[] = [];
    client.interceptors.request.use((config) => {
      const h: any = config.headers;
      const v = h.get ? h.get("Authorization") : h.Authorization;
      seen.push(String(v));
      // short-circuit: reject so no real network call is made
      return Promise.reject({ __shortCircuit: true, config }) as any;
    });

    for (const url of ["/api/users/me", "/api/audits", "/api/anything"]) {
      await client.get(url).catch((e) => {
        if (!e.__shortCircuit) throw e;
      });
    }

    expect(seen).toHaveLength(3);
    for (const v of seen) expect(v).toBe(`Bearer ${API_KEY}`);
  });

  it("loadConfig rejects missing PWNDOC_API_KEY", async () => {
    delete process.env.PWNDOC_API_KEY;
    vi.resetModules();
    const { loadConfig } = await import("../src/config.js");
    expect(() => loadConfig()).toThrow(/PWNDOC_API_KEY/);
  });

  it("loadConfig rejects malformed PWNDOC_API_KEY", async () => {
    process.env.PWNDOC_API_KEY = "not-a-real-key";
    vi.resetModules();
    const { loadConfig } = await import("../src/config.js");
    expect(() => loadConfig()).toThrow(/wrong format/);
  });
});
