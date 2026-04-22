const AUTH_EXPIRED_MSG =
  "API_KEY_INVALID: the configured PWNDOC_API_KEY is invalid or missing.\n" +
  "Fix: in PwnDoc, open Profile → API keys, create a new key, and set " +
  "PWNDOC_API_KEY to the one-time 'pwndoc_<…>' value in your MCP client config.";

export class AuthExpiredError extends Error {
  constructor(message = AUTH_EXPIRED_MSG) {
    super(message);
    this.name = "AuthExpiredError";
  }
}

export class PwndocApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "PwndocApiError";
  }
}

export function formatError(e: unknown): string {
  if (e instanceof AuthExpiredError) return e.message;
  if (e instanceof PwndocApiError) return `PwnDoc API ${e.status}: ${e.message}`;
  if (e instanceof Error) return e.message;
  return String(e);
}
