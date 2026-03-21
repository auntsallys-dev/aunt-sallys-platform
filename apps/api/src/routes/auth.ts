import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, refreshTokens } from "@aunt-sallys/db";
import { loginSchema } from "@aunt-sallys/shared";
import crypto from "crypto";
import { signJWT } from "../middleware/auth.js";

export const authRoutes = new Hono();

// POST /api/v1/auth/login
authRoutes.post("/login", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const result = loginSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, error: result.error.flatten() }, 400);
  }

  const { email, password } = result.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email!))
    .limit(1);

  if (!user || !user.passwordHash) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ success: false, error: "Invalid credentials" }, 401);
  }

  if (!user.isActive) {
    return c.json({ success: false, error: "Account disabled" }, 403);
  }

  await db.update(users).set({ lastLogin: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));

  const accessToken = await signJWT(
    { sub: user.id, role: user.role, orgId: user.orgId, branchId: user.branchId },
    "15m"
  );

  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({ userId: user.id, tokenHash, expiresAt });

  return c.json({
    success: true,
    data: {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        orgId: user.orgId,
        branchId: user.branchId,
      },
    },
  });
});

// POST /api/v1/auth/logout
authRoutes.post("/logout", async (c) => {
  try {
    const body = await c.req.json();
    if (body?.refreshToken) {
      const tokenHash = crypto.createHash("sha256").update(body.refreshToken).digest("hex");
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    }
  } catch {}
  return c.json({ success: true });
});

// POST /api/v1/auth/refresh
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!body?.refreshToken) return c.json({ success: false, error: "refreshToken required" }, 400);

  const tokenHash = crypto.createHash("sha256").update(body.refreshToken).digest("hex");
  const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash)).limit(1);
  if (!token || token.expiresAt < new Date()) return c.json({ success: false, error: "Invalid or expired refresh token" }, 401);

  const [user] = await db.select().from(users).where(eq(users.id, token.userId)).limit(1);
  if (!user || !user.isActive) return c.json({ success: false, error: "User not found or disabled" }, 401);

  await db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));
  const newRaw = crypto.randomBytes(40).toString("hex");
  const newHash = crypto.createHash("sha256").update(newRaw).digest("hex");
  await db.insert(refreshTokens).values({ userId: user.id, tokenHash: newHash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  const accessToken = await signJWT({ sub: user.id, role: user.role, orgId: user.orgId, branchId: user.branchId }, "15m");
  return c.json({ success: true, data: { accessToken, refreshToken: newRaw, expiresIn: 900 } });
});

// GET /api/v1/auth/me
authRoutes.get("/me", async (c) => {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return c.json({ success: false, error: "Unauthorized" }, 401);
  // Just return success for health check
  return c.json({ success: true });
});
