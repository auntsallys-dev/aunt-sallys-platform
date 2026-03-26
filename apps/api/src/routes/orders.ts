import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, orders, orderItems, orderStatusHistory, services, branchServices, customers } from "@aunt-sallys/db";
import { createOrderSchema, updateOrderStatusSchema } from "@aunt-sallys/shared";
import { authenticate } from "../middleware/auth.js";
import { formatOrderNumber } from "@aunt-sallys/shared";

export const ordersRoutes = new Hono();

// GET /api/v1/orders?branchId=xxx&status=xxx&date=xxx
ordersRoutes.get("/", authenticate, async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;
  const status = c.req.query("status");
  const dateStr = c.req.query("date"); // YYYY-MM-DD

  let query = db.select().from(orders).orderBy(desc(orders.createdAt)).$dynamic();

  // Scope by branch
  if (branchId) {
    query = query.where(eq(orders.branchId, branchId));
  }

  const list = await query.limit(200);

  // Filter by status if provided
  let filtered = status ? list.filter((o) => o.status === status) : list;

  // Filter by date if provided
  if (dateStr) {
    const startOfDay = new Date(dateStr + "T00:00:00.000Z");
    const endOfDay = new Date(dateStr + "T23:59:59.999Z");
    filtered = filtered.filter((o) => {
      const created = new Date(o.createdAt!);
      return created >= startOfDay && created <= endOfDay;
    });
  }

  // Enrich with customer info
  const enriched = await Promise.all(filtered.map(async (order) => {
    let customerName = "Walk-in Customer";
    if (order.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
      if (cust) customerName = `${cust.firstName} ${cust.lastName}`.trim();
    }

    const items = await db.select({
      id: orderItems.id,
      serviceId: orderItems.serviceId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      notes: orderItems.notes,
      serviceName: services.name,
      priceUnit: services.priceUnit,
    })
    .from(orderItems)
    .leftJoin(services, eq(services.id, orderItems.serviceId))
    .where(eq(orderItems.orderId, order.id));

    return { ...order, customerName, items };
  }));

  return c.json({ success: true, data: enriched });
});

// POST /api/v1/orders
ordersRoutes.post("/", authenticate, async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const result = createOrderSchema.safeParse(body);
  if (!result.success) {
    return c.json({ success: false, error: result.error.flatten() }, 400);
  }

  const authUser = c.get("authUser");
  const { branchId, customerId, orderType, items, notes, paymentMethod } = result.data;

  const year = new Date().getFullYear();
  const count = await db.$count(orders);
  const orderNumber = formatOrderNumber(year, count + 1);

  let subtotal = 0;
  const itemsToInsert: { serviceId: string; quantity: string; unitPrice: string; totalPrice: string; notes?: string }[] = [];

  for (const item of items) {
    const [service] = await db.select().from(services).where(eq(services.id, item.serviceId)).limit(1);
    if (!service) return c.json({ success: false, error: `Service ${item.serviceId} not found` }, 400);

    // Check branch override
    const [bs] = await db.select().from(branchServices)
      .where(and(eq(branchServices.serviceId, item.serviceId), eq(branchServices.branchId, branchId)))
      .limit(1);

    const unitPrice = parseFloat((bs?.priceOverride ?? service.basePrice) as string);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    itemsToInsert.push({
      serviceId: item.serviceId,
      quantity: String(item.quantity),
      unitPrice: String(unitPrice),
      totalPrice: String(totalPrice),
      notes: item.notes,
    });
  }

  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const discountAmount = parseFloat((body as any).discount ?? "0") || 0;
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  const [order] = await db.insert(orders).values({
    orderNumber,
    branchId,
    customerId,
    orderType,
    subtotal: String(subtotal),
    deliveryFee: String(deliveryFee),
    total: String(total),
    notes,
    paymentMethod,
    createdBy: authUser.id,
  }).returning();

  await db.insert(orderItems).values(itemsToInsert.map((i) => ({ ...i, orderId: order.id })));
  await db.insert(orderStatusHistory).values({ orderId: order.id, status: "pending", changedBy: authUser.id });

  // Re-fetch with items
  const enrichedItems = await db.select({
    id: orderItems.id,
    serviceId: orderItems.serviceId,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    totalPrice: orderItems.totalPrice,
    notes: orderItems.notes,
    serviceName: services.name,
    priceUnit: services.priceUnit,
  })
  .from(orderItems)
  .leftJoin(services, eq(services.id, orderItems.serviceId))
  .where(eq(orderItems.orderId, order.id));

  return c.json({ success: true, data: { ...order, items: enrichedItems } }, 201);
});

// GET /api/v1/orders/:id
ordersRoutes.get("/:id", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  const items = await db.select({
    id: orderItems.id,
    serviceId: orderItems.serviceId,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    totalPrice: orderItems.totalPrice,
    notes: orderItems.notes,
    serviceName: services.name,
    priceUnit: services.priceUnit,
  })
  .from(orderItems)
  .leftJoin(services, eq(services.id, orderItems.serviceId))
  .where(eq(orderItems.orderId, id));

  let customerName = "Walk-in Customer";
  if (order.customerId) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
    if (cust) customerName = `${cust.firstName} ${cust.lastName}`.trim();
  }

  return c.json({ success: true, data: { ...order, customerName, items } });
});

// PATCH /api/v1/orders/:id  — edit items, apply extra charges, or process refund
ordersRoutes.patch("/:id", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const authUser = c.get("authUser");

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  // Block editing completed/delivered/cancelled orders
  if (["completed", "delivered", "cancelled"].includes(order.status)) {
    return c.json({ success: false, error: "Cannot edit a completed, delivered, or cancelled order" }, 400);
  }

  // Process refund
  if (body.refund === true) {
    if (order.paymentStatus !== "paid") {
      return c.json({ success: false, error: "Order must be paid to process a refund" }, 400);
    }
    const [updated] = await db.update(orders)
      .set({ paymentStatus: "refunded", updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    await db.insert(orderStatusHistory).values({
      orderId: id, status: "cancelled", notes: "Refund processed", changedBy: authUser.id,
    });
    return c.json({ success: true, data: updated });
  }

  // Remove items
  const removeItemIds: string[] = body.removeItemIds ?? [];
  if (removeItemIds.length > 0) {
    await db.delete(orderItems).where(
      and(eq(orderItems.orderId, id), inArray(orderItems.id, removeItemIds))
    );
  }

  // Add regular service items
  const addItems: { serviceId: string; quantity: number; notes?: string }[] = body.addItems ?? [];
  for (const item of addItems) {
    const [service] = await db.select().from(services).where(eq(services.id, item.serviceId)).limit(1);
    if (!service) continue;
    const [bs] = await db.select().from(branchServices)
      .where(and(eq(branchServices.serviceId, item.serviceId), eq(branchServices.branchId, order.branchId)))
      .limit(1);
    const unitPrice = parseFloat((bs?.priceOverride ?? service.basePrice) as string);
    const totalPrice = unitPrice * item.quantity;
    await db.insert(orderItems).values({
      orderId: id,
      serviceId: item.serviceId,
      quantity: String(item.quantity),
      unitPrice: String(unitPrice),
      totalPrice: String(totalPrice),
      notes: item.notes,
    });
  }

  // Add extra charges (custom line items — no serviceId)
  const extraCharges: { name: string; price: number }[] = body.extraCharges ?? [];
  for (const charge of extraCharges) {
    await db.insert(orderItems).values({
      orderId: id,
      serviceId: null,
      customName: charge.name,
      quantity: "1",
      unitPrice: String(charge.price),
      totalPrice: String(charge.price),
    });
  }

  // Recalculate totals
  const currentItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const subtotal = currentItems.reduce((s, i) => s + parseFloat(i.totalPrice as string), 0);
  const deliveryFee = parseFloat(order.deliveryFee as string);
  const discount = parseFloat(order.discount as string);
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const [updatedOrder] = await db.update(orders)
    .set({ subtotal: String(subtotal), total: String(total), updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  const enrichedItems = await db.select({
    id: orderItems.id,
    serviceId: orderItems.serviceId,
    customName: orderItems.customName,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    totalPrice: orderItems.totalPrice,
    notes: orderItems.notes,
    serviceName: services.name,
    priceUnit: services.priceUnit,
  })
  .from(orderItems)
  .leftJoin(services, eq(services.id, orderItems.serviceId))
  .where(eq(orderItems.orderId, id));

  return c.json({ success: true, data: { ...updatedOrder, items: enrichedItems } });
});

// PATCH /api/v1/orders/:id/status
ordersRoutes.patch("/:id/status", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const result = updateOrderStatusSchema.safeParse(body);
  if (!result.success) return c.json({ success: false, error: result.error.flatten() }, 400);

  const { status, notes } = result.data;
  const authUser = c.get("authUser");

  const [order] = await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  await db.insert(orderStatusHistory).values({ orderId: id, status, notes, changedBy: authUser.id });

  return c.json({ success: true, data: order });
});
