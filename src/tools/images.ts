import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import { getImage, uploadImage, deleteImage, downloadImageBinary } from "../api/images.js";
import { readUploadSource, writeBinary, ensureSubdir } from "../lib/binary-io.js";
import { requireConfirm } from "../lib/confirm.js";
import { STATE_DIR_FN } from "../state/paths.js";

function extFromContentType(ct: string): string {
  const m: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return m[ct.split(";")[0].trim()] || "bin";
}

export const imageTools: ToolDef[] = [
  {
    name: "upload_image",
    description:
      "Upload an image to PwnDoc. `source` may be an absolute filesystem path, a data: URL, or bare base64. Returns the created image's id and backend URL — paste the URL into a finding's description to embed.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Absolute path | data:image/*;base64,... | bare base64" },
        auditId: { type: "string", description: "Optional: scope the image to an audit." },
        name: { type: "string", description: "Optional: filename/caption hint." },
      },
      required: ["source"],
    },
    handler: async ({ source, auditId, name }) => {
      const parsed = readUploadSource(source);
      // Backend accepts the data: URL form — safer than bare base64 for mime preservation.
      const value = source.startsWith("data:") ? source : `data:${parsed.mime};base64,${parsed.base64}`;
      const res = await uploadImage({ base64: value, name: name ?? parsed.name, auditId });
      return jsonOut({ ok: true, image: res });
    },
  },
  {
    name: "get_image",
    description: "Fetch image metadata (no binary) by id.",
    inputSchema: {
      type: "object",
      properties: { imageId: { type: "string" } },
      required: ["imageId"],
    },
    handler: async ({ imageId }) => jsonOut(await getImage(imageId)),
  },
  {
    name: "download_image",
    description:
      "Download an image binary to local disk. MCP tools can't return bytes, so this writes the file and returns the absolute path. Defaults to <state_dir>/images/<id>.<ext>.",
    inputSchema: {
      type: "object",
      properties: {
        imageId: { type: "string" },
        outputPath: { type: "string", description: "Optional absolute path." },
      },
      required: ["imageId"],
    },
    handler: async ({ imageId, outputPath }) => {
      const { bytes, contentType } = await downloadImageBinary(imageId);
      const imagesDir = ensureSubdir(STATE_DIR_FN(), "images");
      const ext = extFromContentType(contentType);
      const target = writeBinary(bytes, outputPath, imagesDir, `${imageId}.${ext}`);
      return jsonOut({ ok: true, path: target, bytes: bytes.length, contentType });
    },
  },
  {
    name: "delete_image",
    description: "Delete an image. Requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: { imageId: { type: "string" }, confirm: { type: "boolean" } },
      required: ["imageId", "confirm"],
    },
    handler: async (args) => {
      requireConfirm(args, "delete_image");
      await deleteImage(args.imageId);
      return jsonOut({ ok: true, deletedImageId: args.imageId });
    },
  },
];
