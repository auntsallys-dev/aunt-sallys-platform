import type { Context } from "hono";
import type { AuditContext } from "@aunt-sallys/db";
import type { AuthUser } from "../middleware/auth.js";

/**
 * Build an AuditContext from an authenticated Hono request.
 * Captures user, role, IP (best-effort), user-agent, optional reason from the
 * request body or query string.
 */
export function auditContextFrom(c: Context, opts: { reason?: string | null } = {}): AuditContext {
  const user = c.get("authUser") as AuthUser | undefined;
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    null;
  const userAgent = c.req.header("user-agent") ?? null;

  return {
    userId: user?.id ?? null,
    userEmail: null, // populated downstream if needed
    userRole: user?.role ?? null,
    ipAddress: ip,
    userAgent,
    reason: opts.reason ?? null,
  };
}
