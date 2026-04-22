import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readUploadSource, writeBinary } from "../src/lib/binary-io.js";

describe("readUploadSource", () => {
  it("parses a data: URL", () => {
    const payload = Buffer.from("hello").toString("base64");
    const r = readUploadSource(`data:image/png;base64,${payload}`);
    expect(r.mime).toBe("image/png");
    expect(r.base64).toBe(payload);
    expect(r.bytes.toString()).toBe("hello");
  });

  it("reads from an absolute filesystem path with mime inferred from extension", () => {
    const tmp = path.join(os.tmpdir(), `pwndoc-mcp-upload-test-${Date.now()}.png`);
    const bytes = Buffer.from([137, 80, 78, 71]);
    fs.writeFileSync(tmp, bytes);
    try {
      const r = readUploadSource(tmp);
      expect(r.mime).toBe("image/png");
      expect(r.bytes.equals(bytes)).toBe(true);
      expect(r.name).toBe(path.basename(tmp));
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("accepts bare base64", () => {
    const payload = Buffer.from("hi").toString("base64");
    const r = readUploadSource(payload);
    expect(r.bytes.toString()).toBe("hi");
    expect(r.mime).toBe("application/octet-stream");
  });

  it("rejects garbage", () => {
    expect(() => readUploadSource("not a path, not base64, has spaces!!!")).toThrow();
  });
});

describe("writeBinary", () => {
  const tmpDir = path.join(os.tmpdir(), `pwndoc-mcp-writebin-${Date.now()}`);
  beforeEach(() => { fs.mkdirSync(tmpDir, { recursive: true }); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it("writes to an absolute outputPath when provided", () => {
    const target = path.join(tmpDir, "out.bin");
    const result = writeBinary(Buffer.from("abc"), target, tmpDir, "fallback.bin");
    expect(result).toBe(path.resolve(target));
    expect(fs.readFileSync(result).toString()).toBe("abc");
  });

  it("falls back to fallbackDir/fallbackName when no path given", () => {
    const result = writeBinary(Buffer.from("xyz"), undefined, tmpDir, "fallback.bin");
    expect(result).toBe(path.resolve(path.join(tmpDir, "fallback.bin")));
    expect(fs.readFileSync(result).toString()).toBe("xyz");
  });
});
