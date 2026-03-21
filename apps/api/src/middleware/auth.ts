import type { Context, Next } from "hono";
import * as jose from "jose";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface AuthUser {
  id: string;
  role: string;
  orgId: string | null;
  branchId: string | null;
}

declare module "hono" {
  interface ContextVariableMap {
    authUser: AuthUser;
  }
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function signJWT(payload: Record<string, unknown>, expiresIn = "15m"): Promise<string> {
  const expSeconds = expiresIn === "15m" ? 900 : expiresIn === "7d" ? 7 * 24 * 3600 : 900;
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .sign(secret);
}

export async function authenticate(c: Context, next: Next) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }
  const token = auth.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    c.set("authUser", {
      id: payload.sub as string,
      role: payload.role as string,
      orgId: (payload.orgId as string) ?? null,
      branchId: (payload.branchId as string) ?? null,
    });
    await next();
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }
}

export async function requireRole(role: string) {
  const ROLE_HIERARCHY: Record<string, number> = {
    customer: 0, staff: 1, branch_admin: 2, org_admin: 3, superadmin: 4,
  };
  return async (c: Context, next: Next) => {
    await authenticate(c, async () => {});
    const user = c.get("authUser");
    if (!user) return c.json({ success: false, error: "Unauthorized" }, 401);
    if ((ROLE_HIERARCHY[user.role] ?? -1) < (ROLE_HIERARCHY[role] ?? 99)) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }
    await next();
  };
}
