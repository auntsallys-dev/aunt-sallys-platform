import { Hono } from "hono";
import { or, ilike } from "drizzle-orm";
import { db, customers } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

export const customersRoutes = new Hono();

// GET /api/v1/customers?phone=xxx&name=xxx
customersRoutes.get("/", authenticate, async (c) => {
  const phone = c.req.query("phone");
  const name = c.req.query("name");

  let list;
  if (phone) {
    list = await db.select().from(customers).where(ilike(customers.phone, `%${phone}%`)).limit(20);
  } else if (name) {
    list = await db.select().from(customers)
      .where(or(ilike(customers.firstName, `%${name}%`), ilike(customers.lastName, `%${name}%`)))
      .limit(20);
  } else {
    list = await db.select().from(customers).limit(50);
  }

  return c.json({ success: true, data: list });
});

// POST /api/v1/customers
customersRoutes.post("/", authenticate, async (c) => {
  const schema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().default(""),
    phone: z.string().min(7).default(""),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  });

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const result = schema.safeParse(body);
  if (!result.success) return c.json({ success: false, error: result.error.flatten() }, 400);

  const authUser = c.get("authUser");
  const { firstName, lastName, phone, email, notes } = result.data;

  const [customer] = await db.insert(customers).values({
    firstName,
    lastName: lastName || "",
    phone: phone || "",
    email,
    notes,
    orgId: authUser.orgId!,
  }).returning();

  return c.json({ success: true, data: customer }, 201);
});
