import fs from "node:fs";
import path from "node:path";

/**
 * Accept either an absolute filesystem path, a data: URL, or a bare base64 string.
 * Return the raw bytes AND a best-effort mime guess.
 */
export function readUploadSource(source: string): { bytes: Buffer; base64: string; mime: string; name: string } {
  if (source.startsWith("data:")) {
    const m = source.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error("Invalid data: URL — expected 'data:<mime>;base64,<payload>'");
    const bytes = Buffer.from(m[2], "base64");
    return { bytes, base64: m[2], mime: m[1], name: "upload" };
  }
  if (path.isAbsolute(source) && fs.existsSync(source)) {
    const bytes = fs.readFileSync(source);
    const ext = path.extname(source).toLowerCase().replace(/^\./, "") || "bin";
    const mime = extToMime(ext);
    return { bytes, base64: bytes.toString("base64"), mime, name: path.basename(source) };
  }
  // Assume bare base64
  const cleaned = source.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
    throw new Error("upload source must be an absolute path, a data: URL, or bare base64");
  }
  const bytes = Buffer.from(cleaned, "base64");
  return { bytes, base64: cleaned, mime: "application/octet-stream", name: "upload" };
}

function extToMime(ext: string): string {
  const m: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return m[ext] || "application/octet-stream";
}

/**
 * Write binary payload to a filesystem path and return the absolute path.
 * If `outputPath` is omitted, writes to `<fallbackDir>/<fallbackName>`.
 */
export function writeBinary(bytes: Buffer, outputPath: string | undefined, fallbackDir: string, fallbackName: string): string {
  const target = outputPath && path.isAbsolute(outputPath)
    ? outputPath
    : path.join(fallbackDir, outputPath ?? fallbackName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
  return path.resolve(target);
}

export function ensureSubdir(root: string, name: string): string {
  const p = path.join(root, name);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true, mode: 0o700 });
  return p;
}
