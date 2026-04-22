export interface ToolDef {
  name: string;
  description: string;
  inputSchema: any;   // JSON schema
  handler: (args: any) => Promise<string>;  // returns text content
}

export function ok(text: string): string {
  return text;
}

export function jsonOut(obj: any): string {
  return JSON.stringify(obj, null, 2);
}
