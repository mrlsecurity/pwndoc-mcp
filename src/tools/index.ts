import type { ToolDef } from "./types.js";
import { sessionTools } from "./session.js";
import { currentAuditTools } from "./currentAudit.js";
import { auditReadTools } from "./auditReads.js";
import { auditActionTools } from "./auditActions.js";
import { findingReadTools } from "./findingReads.js";
import { findingWriteTools } from "./findingWrites.js";
import { commentTools } from "./comments.js";
import { approvalTools } from "./approvals.js";
import { subscriptionTools } from "./subscriptions.js";
import { supportTools } from "./support.js";
import { vulnLibraryWriteTools } from "./vulnLibraryWrites.js";
import { clientCompanyTools } from "./clientsCompanies.js";
import { imageTools } from "./images.js";

export const ALL_TOOLS: ToolDef[] = [
  ...sessionTools,
  ...currentAuditTools,
  ...auditReadTools,
  ...auditActionTools,
  ...findingReadTools,
  ...findingWriteTools,
  ...commentTools,
  ...approvalTools,
  ...subscriptionTools,
  ...supportTools,
  ...vulnLibraryWriteTools,
  ...clientCompanyTools,
  ...imageTools,
];

export function findTool(name: string): ToolDef | undefined {
  return ALL_TOOLS.find(t => t.name === name);
}
