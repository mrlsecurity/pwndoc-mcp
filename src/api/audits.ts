import { getClient, unwrapData } from "./client.js";

export async function listAudits(): Promise<any[]> {
  const r = await getClient().get("/api/audits");
  return unwrapData<any[]>(r);
}

export async function getAudit(auditId: string): Promise<any> {
  const r = await getClient().get(`/api/audits/${auditId}`);
  return unwrapData<any>(r);
}

export async function getAuditGeneral(auditId: string): Promise<any> {
  const r = await getClient().get(`/api/audits/${auditId}/general`);
  return unwrapData<any>(r);
}

export async function getAuditNetwork(auditId: string): Promise<any> {
  const r = await getClient().get(`/api/audits/${auditId}/network`);
  return unwrapData<any>(r);
}

export async function getAuditChildren(auditId: string): Promise<any[]> {
  const r = await getClient().get(`/api/audits/${auditId}/children`);
  return unwrapData<any[]>(r);
}

export async function getAuditRetest(auditId: string): Promise<any> {
  const r = await getClient().get(`/api/audits/${auditId}/retest`);
  return unwrapData<any>(r);
}

export async function createAudit(input: { name: string; language: string; auditType: string; type?: string }): Promise<any> {
  const r = await getClient().post("/api/audits", input);
  return unwrapData<any>(r);
}

export async function toggleApproval(auditId: string): Promise<any> {
  const r = await getClient().put(`/api/audits/${auditId}/toggleApproval`, {});
  return unwrapData<any>(r);
}

export async function updateReadyForReview(auditId: string, state: string): Promise<any> {
  const r = await getClient().put(`/api/audits/${auditId}/updateReadyForReview`, { state });
  return unwrapData<any>(r);
}

export async function deleteAudit(auditId: string): Promise<any> {
  const r = await getClient().delete(`/api/audits/${auditId}`);
  return unwrapData<any>(r);
}

export async function updateAuditNetwork(auditId: string, scope: any[]): Promise<any> {
  const r = await getClient().put(`/api/audits/${auditId}/network`, { scope });
  return unwrapData<any>(r);
}

export async function updateAuditSection(
  auditId: string,
  sectionId: string,
  customFields: any,
  text?: string,
): Promise<any> {
  const body: any = { customFields };
  if (text !== undefined) body.text = text;
  const r = await getClient().put(`/api/audits/${auditId}/sections/${sectionId}`, body);
  return unwrapData<any>(r);
}

export async function getAuditSections(auditId: string): Promise<any[]> {
  // Sections are part of the audit document; pull via the general/full audit read.
  const audit = await getAudit(auditId);
  return audit?.sections ?? [];
}

/**
 * Fetch the DOCX report. Backend sends raw binary with Content-Disposition.
 */
export async function generateAuditReportBinary(auditId: string): Promise<{ bytes: Buffer; filename: string }> {
  const r = await getClient().get(`/api/audits/${auditId}/generate`, {
    responseType: "arraybuffer",
    // 500s are real errors here — don't mask them as a "success" envelope.
    validateStatus: (s) => s < 500,
  });
  if (r.status >= 400) {
    // Error envelopes come back as JSON in bytes.
    const text = Buffer.from(r.data).toString("utf8");
    throw new Error(`report generation failed (HTTP ${r.status}): ${text.slice(0, 500)}`);
  }
  const cd = r.headers?.["content-disposition"] || "";
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const filename = m ? decodeURIComponent(m[1]) : `audit-${auditId}.docx`;
  return { bytes: Buffer.from(r.data), filename };
}
