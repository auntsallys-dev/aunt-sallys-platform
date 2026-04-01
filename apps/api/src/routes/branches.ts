import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, branches } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";

export const branchesRoutes = new Hono();

const adminOnly = async (c: any, next: any) => {
  const user = c.get("authUser");
  const allowed = ["branch_admin", "org_admin", "superadmin"];
  if (!allowed.includes(user.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  return await next();
};

// GET /api/v1/branches
branchesRoutes.get("/", async (c) => {
  const all = c.req.query("all");
  const list = all === "true"
    ? await db.select().from(branches)
    : await db.select().from(branches).where(eq(branches.isActive, true));
  return c.json({ success: true, data: list });
});

// GET /api/v1/branches/:id
branchesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!branch) return c.json({ success: false, error: "Branch not found" }, 404);
  return c.json({ success: true, data: branch });
});

// POST /api/v1/branches — create branch
branchesRoutes.post("/", authenticate, adminOnly, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const authUser = c.get("authUser");
  const { name, slug, address, phone, email, lat, lng } = body;

  if (!name || !slug) return c.json({ success: false, error: "name and slug are required" }, 400);

  const orgId = authUser.orgId;
  if (!orgId) return c.json({ success: false, error: "User has no orgId" }, 400);

  const [branch] = await db.insert(branches).values({
    orgId,
    name,
    slug,
    address: address ?? null,
    phone: phone ?? null,
    email: email ?? null,
    lat: lat ? String(lat) : null,
    lng: lng ? String(lng) : null,
    isActive: true,
  }).returning();

  return c.json({ success: true, data: branch }, 201);
});

// PATCH /api/v1/branches/:id — update branch
branchesRoutes.patch("/:id", authenticate, adminOnly, async (c) => {
  const id = c.req.param("id") as string;
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const [existing] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!existing) return c.json({ success: false, error: "Branch not found" }, 404);

  const updates: any = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.address !== undefined) updates.address = body.address;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.email !== undefined) updates.email = body.email;
  if (body.lat !== undefined) updates.lat = body.lat ? String(body.lat) : null;
  if (body.lng !== undefined) updates.lng = body.lng ? String(body.lng) : null;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  const [updated] = await db.update(branches).set(updates).where(eq(branches.id, id)).returning();
  return c.json({ success: true, data: updated });
});

// DELETE /api/v1/branches/:id — soft delete
branchesRoutes.delete("/:id", authenticate, adminOnly, async (c) => {
  const id = c.req.param("id") as string;
  const [existing] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!existing) return c.json({ success: false, error: "Branch not found" }, 404);

  const [updated] = await db.update(branches)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(branches.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});
