import { getAudit } from "../api/audits.js";
import { getFinding } from "../api/findings.js";
import { getVulnerability, listVulnerabilities } from "../api/vulns.js";

export interface ResourceDescriptor {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export async function listResources(): Promise<ResourceDescriptor[]> {
  // Static templates only — dynamic per-audit/per-finding URIs are resolved on read.
  return [
    {
      uri: "pwndoc://vuln-library",
      name: "vulnerability-library",
      description: "List of all entries in the shared vulnerability library (slim).",
      mimeType: "application/json",
    },
  ];
}

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

export async function readResource(uri: string): Promise<ResourceContent> {
  // pwndoc://audit/{id}
  let m = uri.match(/^pwndoc:\/\/audit\/([^/]+)$/);
  if (m) {
    const a = await getAudit(m[1]);
    return { uri, mimeType: "application/json", text: JSON.stringify(a) };
  }
  // pwndoc://audit/{id}/finding/{id}
  m = uri.match(/^pwndoc:\/\/audit\/([^/]+)\/finding\/([^/]+)$/);
  if (m) {
    const f = await getFinding(m[1], m[2]);
    return { uri, mimeType: "application/json", text: JSON.stringify(f) };
  }
  // pwndoc://vuln-library/{id}
  m = uri.match(/^pwndoc:\/\/vuln-library\/([^/]+)$/);
  if (m) {
    const v = await getVulnerability(m[1]);
    return { uri, mimeType: "application/json", text: JSON.stringify(v) };
  }
  // pwndoc://vuln-library
  if (uri === "pwndoc://vuln-library") {
    const list = await listVulnerabilities();
    return { uri, mimeType: "application/json", text: JSON.stringify(list) };
  }
  throw new Error(`Unknown resource URI: ${uri}`);
}

export const RESOURCE_TEMPLATES = [
  { uriTemplate: "pwndoc://audit/{auditId}", name: "audit", description: "Full audit JSON", mimeType: "application/json" },
  { uriTemplate: "pwndoc://audit/{auditId}/finding/{findingId}", name: "finding", description: "Full finding JSON", mimeType: "application/json" },
  { uriTemplate: "pwndoc://vuln-library/{vulnId}", name: "vuln-library-entry", description: "Vulnerability library entry", mimeType: "application/json" },
];
