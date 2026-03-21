import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db, services, branchServices } from "@aunt-sallys/db";

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
