import { getClient, unwrapData } from "./client.js";

export async function getImage(imageId: string): Promise<any> {
  const r = await getClient().get(`/api/images/${imageId}`);
  return unwrapData<any>(r);
}

export async function uploadImage(args: { base64: string; name?: string; auditId?: string }): Promise<any> {
  // Backend wants `value` = base64 string (may include data: prefix or bare).
  const body: any = { value: args.base64 };
  if (args.name) body.name = args.name;
  if (args.auditId) body.auditId = args.auditId;
  const r = await getClient().post("/api/images", body);
  return unwrapData<any>(r);
}

export async function deleteImage(imageId: string): Promise<any> {
  const r = await getClient().delete(`/api/images/${imageId}`);
  return unwrapData<any>(r);
}

/**
 * /api/images/download/:id returns raw PNG bytes (Content-Type: image/png).
 */
export async function downloadImageBinary(imageId: string): Promise<{ bytes: Buffer; contentType: string }> {
  const r = await getClient().get(`/api/images/download/${imageId}`, {
    responseType: "arraybuffer",
    validateStatus: (s) => s < 500,
  });
  if (r.status >= 400) {
    const text = Buffer.from(r.data).toString("utf8");
    throw new Error(`image download failed (HTTP ${r.status}): ${text.slice(0, 300)}`);
  }
  return { bytes: Buffer.from(r.data), contentType: r.headers?.["content-type"] || "image/png" };
}
