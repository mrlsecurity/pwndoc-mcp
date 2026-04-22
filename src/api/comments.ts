import { getClient, unwrapData } from "./client.js";

export interface CreateCommentInput {
  findingId?: string;
  sectionId?: string;
  fieldName: string;
  authorId: string;
  text?: string;
}

export async function createComment(auditId: string, input: CreateCommentInput): Promise<any> {
  const r = await getClient().post(`/api/audits/${auditId}/comments`, input);
  return unwrapData<any>(r);
}

export async function deleteComment(auditId: string, commentId: string): Promise<any> {
  const r = await getClient().delete(`/api/audits/${auditId}/comments/${commentId}`);
  return unwrapData<any>(r);
}

export async function updateComment(auditId: string, commentId: string, fields: { text?: string; resolved?: boolean; replies?: any[] }): Promise<any> {
  const r = await getClient().put(`/api/audits/${auditId}/comments/${commentId}`, fields);
  return unwrapData<any>(r);
}
