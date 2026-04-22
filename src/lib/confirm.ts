/**
 * Gate for destructive operations. Tools accept `confirm: true` explicitly — any
 * other value (missing, false, string "yes") refuses. This is a foot-gun guard,
 * not real authorization.
 */
export function requireConfirm(args: any, opName: string): void {
  if (args?.confirm !== true) {
    throw new Error(
      `${opName} is destructive. Pass { "confirm": true } to proceed. This is a safety gate, not authorization.`,
    );
  }
}
