import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, branches } from "@aunt-sallys/db";

export const branchesRoutes = new Hono();

// GET /api/v1/branches
branchesRoutes.get("/", async (c) => {
  const list = await db.select().from(branches).where(eq(branches.isActive, true));
  return c.json({ success: true, data: list });
});

// GET /api/v1/branches/:id
branchesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  if (!branch) return c.json({ success: false, error: "Branch not found" }, 404);
  return c.json({ success: true, data: branch });
});
