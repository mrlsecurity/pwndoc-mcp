import { getClient, unwrapData } from "./client.js";

export interface MeUser {
  _id: string;
  username: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  roles?: string[];
  role?: string;
}

let meCache: MeUser | null = null;

export async function getMe(force = false): Promise<MeUser> {
  if (meCache && !force) return meCache;
  const r = await getClient().get("/api/users/me");
  meCache = unwrapData<MeUser>(r);
  return meCache;
}

export function clearMeCache(): void { meCache = null; }

export async function listAllUsers(): Promise<any[]> {
  const r = await getClient().get("/api/users");
  return unwrapData<any[]>(r);
}

export async function listReviewers(): Promise<any[]> {
  const r = await getClient().get("/api/users/reviewers");
  return unwrapData<any[]>(r);
}
