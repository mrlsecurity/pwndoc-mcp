import { getClient, unwrapData } from "./client.js";

export async function listClients(): Promise<any[]> {
  const r = await getClient().get("/api/clients");
  return unwrapData<any[]>(r);
}

export async function getClientById(id: string): Promise<any> {
  // PwnDoc exposes single client via list filter; fall back to scanning the list.
  const all = await listClients();
  return all.find((c: any) => String(c._id) === id) || null;
}

export async function listCompanies(): Promise<any[]> {
  const r = await getClient().get("/api/companies");
  return unwrapData<any[]>(r);
}

export async function listCustomFields(): Promise<any[]> {
  const r = await getClient().get("/api/data/custom-fields");
  return unwrapData<any[]>(r);
}

// --- Client writes ---
export async function createClient(client: any): Promise<any> {
  const r = await getClient().post("/api/clients", client);
  return unwrapData<any>(r);
}
export async function updateClient(id: string, patch: any): Promise<any> {
  const r = await getClient().put(`/api/clients/${id}`, patch);
  return unwrapData<any>(r);
}
export async function deleteClient(id: string): Promise<any> {
  const r = await getClient().delete(`/api/clients/${id}`);
  return unwrapData<any>(r);
}

// --- Company writes ---
export async function getCompanyById(id: string): Promise<any | null> {
  const all = await listCompanies();
  return all.find((c: any) => String(c._id) === id) || null;
}
export async function createCompany(company: any): Promise<any> {
  const r = await getClient().post("/api/companies", company);
  return unwrapData<any>(r);
}
export async function updateCompany(id: string, patch: any): Promise<any> {
  const r = await getClient().put(`/api/companies/${id}`, patch);
  return unwrapData<any>(r);
}
export async function deleteCompany(id: string): Promise<any> {
  const r = await getClient().delete(`/api/companies/${id}`);
  return unwrapData<any>(r);
}
