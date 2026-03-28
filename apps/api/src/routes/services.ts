import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db, services, branchServices } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";

export const servicesRoutes = new Hono();

// GET /api/v1/services?branchId=xxx
servicesRoutes.get("/", async (c) => {
  const branchId = c.req.query("branchId");

  if (branchId) {
    // Get services with branch-specific pricing
    const result = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        basePrice: services.basePrice,
        priceUnit: services.priceUnit,
        minQuantity: services.minQuantity,
        estimatedHours: services.estimatedHours,
        isActive: services.isActive,
        sortOrder: services.sortOrder,
        priceOverride: branchServices.priceOverride,
        isAvailable: branchServices.isAvailable,
      })
      .from(services)
      .innerJoin(branchServices, and(
        eq(branchServices.serviceId, services.id),
        eq(branchServices.branchId, branchId)
      ))
      .where(and(eq(services.isActive, true), eq(branchServices.isAvailable, true)));

    const normalized = result.map((s) => ({
      ...s,
      basePrice: s.priceOverride ?? s.basePrice,
    }));
    return c.json({ success: true, data: normalized });
  }

  const list = await db.select().from(services).where(eq(services.isActive, true));
  return c.json({ success: true, data: list });
});

// GET /api/v1/services/:id
servicesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [service] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!service) return c.json({ success: false, error: "Service not found" }, 404);
  return c.json({ success: true, data: service });
});

// Admin middleware for write operations
const adminOnly = async (c: any, next: any) => {
  const user = c.get("authUser");
  const allowed = ["branch_admin", "org_admin", "superadmin"];
  if (!allowed.includes(user.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  return await next();
};

// POST /api/v1/services — create a service
servicesRoutes.post("/", authenticate, adminOnly, async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const authUser = c.get("authUser");
  const { name, category, basePrice, priceUnit, estimatedHours, description, sortOrder } = body;

  if (!name || !basePrice || !priceUnit) {
    return c.json({ success: false, error: "name, basePrice, and priceUnit are required" }, 400);
  }

  // Get orgId from user
  const orgId = authUser.orgId;
  if (!orgId) return c.json({ success: false, error: "User has no orgId" }, 400);

  const [service] = await db.insert(services).values({
    orgId,
    name,
    category: category ?? null,
    basePrice: String(basePrice),
    priceUnit,
    estimatedHours: estimatedHours ?? null,
    description: description ?? null,
    sortOrder: sortOrder ?? 0,
    isActive: true,
  }).returning();

  return c.json({ success: true, data: service }, 201);
});

// PATCH /api/v1/services/:id — update a service
servicesRoutes.patch("/:id", authenticate, adminOnly, async (c) => {
  const id = c.req.param("id");
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!existing) return c.json({ success: false, error: "Service not found" }, 404);

  const updates: any = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.basePrice !== undefined) updates.basePrice = String(body.basePrice);
  if (body.priceUnit !== undefined) updates.priceUnit = body.priceUnit;
  if (body.estimatedHours !== undefined) updates.estimatedHours = body.estimatedHours;
  if (body.description !== undefined) updates.description = body.description;
  if (body.isActive !== undefined) updates.isActive = body.isActive;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [updated] = await db.update(services).set(updates).where(eq(services.id, id)).returning();
  return c.json({ success: true, data: updated });
});

// DELETE /api/v1/services/:id — soft delete
servicesRoutes.delete("/:id", authenticate, adminOnly, async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!existing) return c.json({ success: false, error: "Service not found" }, 404);

  const [updated] = await db.update(services)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning();
  return c.json({ success: true, data: updated });
});
