import { getClient, unwrapData } from "./client.js";

export async function getFinding(auditId: string, findingId: string): Promise<any> {
  const r = await getClient().get(`/api/audits/${auditId}/findings/${findingId}`);
  return unwrapData<any>(r);
}

export async function createFinding(auditId: string, finding: any): Promise<any> {
  const r = await getClient().post(`/api/audits/${auditId}/findings`, finding);
  return unwrapData<any>(r);
}

export async function updateFinding(auditId: string, findingId: string, finding: any): Promise<any> {
  const r = await getClient().put(`/api/audits/${auditId}/findings/${findingId}`, finding);
  return unwrapData<any>(r);
}

export async function deleteFinding(auditId: string, findingId: string): Promise<any> {
  const r = await getClient().delete(`/api/audits/${auditId}/findings/${findingId}`);
  return unwrapData<any>(r);
}
