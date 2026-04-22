import { getClient, unwrapData } from "./client.js";

export async function listVulnerabilities(): Promise<any[]> {
  const r = await getClient().get("/api/vulnerabilities");
  return unwrapData<any[]>(r);
}

export async function getVulnerability(vulnId: string): Promise<any> {
  const r = await getClient().get(`/api/vulnerabilities/${vulnId}`);
  return unwrapData<any>(r);
}

/**
 * Backend POST /api/vulnerabilities accepts an ARRAY of vuln objects (bulk create).
 * We wrap to accept a single object and always send [obj].
 */
export async function createVulnerability(vuln: any): Promise<any> {
  const r = await getClient().post("/api/vulnerabilities", [vuln]);
  return unwrapData<any>(r);
}

export async function updateVulnerability(vulnId: string, vuln: any): Promise<any> {
  const r = await getClient().put(`/api/vulnerabilities/${vulnId}`, vuln);
  return unwrapData<any>(r);
}

export async function deleteVulnerability(vulnId: string): Promise<any> {
  const r = await getClient().delete(`/api/vulnerabilities/${vulnId}`);
  return unwrapData<any>(r);
}
