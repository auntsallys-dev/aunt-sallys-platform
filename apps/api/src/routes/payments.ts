import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, payments, orders } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { z } from "zod";

export const paymentsRoutes = new Hono();

// POST /api/v1/payments
paymentsRoutes.post("/", authenticate, async (c) => {
  const schema = z.object({
    orderId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(["cash", "gcash", "maya", "card", "bank_transfer"]),
    reference: z.string().optional(),
  });

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
  const result = schema.safeParse(body);
  if (!result.success) return c.json({ success: false, error: result.error.flatten() }, 400);

  const { orderId, amount, method, reference } = result.data;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  const [payment] = await db.insert(payments).values({
    orderId,
    branchId: order.branchId,
    amount: String(amount),
    method,
    status: "completed",
    reference,
  }).returning();

  // Update order payment status
  const orderTotal = parseFloat(order.total);
  const newStatus = amount >= orderTotal ? "paid" : "partial";
  await db.update(orders).set({ paymentStatus: newStatus, updatedAt: new Date() }).where(eq(orders.id, orderId));

  return c.json({ success: true, data: payment }, 201);
});

// GET /api/v1/payments/:orderId
paymentsRoutes.get("/:orderId", authenticate, async (c) => {
  const orderId = c.req.param("orderId");
  const list = await db.select().from(payments).where(eq(payments.orderId, orderId));
  return c.json({ success: true, data: list });
});
