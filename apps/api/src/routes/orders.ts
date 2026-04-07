import { Hono } from "hono";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, orders, orderItems, orderStatusHistory, services, branchServices, customers, deliveries, users, branches } from "@aunt-sallys/db";
import { createOrderSchema, updateOrderStatusSchema } from "@aunt-sallys/shared";
import { authenticate } from "../middleware/auth.js";
import { formatOrderNumber } from "@aunt-sallys/shared";
import { sendOrderStatusEmail } from "../lib/email.js";

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

  // Enrich with customer + branch info
  const enriched = await Promise.all(filtered.map(async (order) => {
    let customerName = "Walk-in Customer";
    if (order.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
      if (cust) customerName = `${cust.firstName} ${cust.lastName}`.trim();
    }

    const [branch] = await db.select({ id: branches.id, name: branches.name })
      .from(branches).where(eq(branches.id, order.branchId)).limit(1);

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

    return { ...order, customerName, branch: branch ?? null, items };
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

// PATCH /api/v1/orders/:id/assign-driver
ordersRoutes.patch("/:id/assign-driver", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const authUser = c.get("authUser");
  const driverId: string = body.driverId ?? authUser.id;
  if (!driverId) return c.json({ success: false, error: "driverId is required" }, 400);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  // Fetch driver info
  const [driver] = await db.select().from(users).where(eq(users.id, driverId)).limit(1);
  if (!driver) return c.json({ success: false, error: "Driver not found" }, 404);

  // Determine leg type based on current order status
  let legType: "pickup" | "delivery";
  let newStatus: string;

  if (order.status === "confirmed") {
    legType = "pickup";
    newStatus = "out_for_pickup";
  } else if (order.status === "ready") {
    legType = "delivery";
    newStatus = "out_for_delivery";
  } else {
    return c.json({ success: false, error: `Cannot assign driver when order status is '${order.status}'` }, 400);
  }

  // Guard against double-assign: check if a delivery record of this type already exists with a driverId
  const existingLegs = await db.select().from(deliveries).where(eq(deliveries.orderId, id));
  const alreadyAssigned = existingLegs.find((d) => d.type === legType && d.driverId !== null);
  if (alreadyAssigned) {
    return c.json({ success: false, error: `A driver is already assigned for the ${legType} leg of this order` }, 409);
  }

  // Insert new delivery leg record
  const [delivery] = await db.insert(deliveries).values({
    orderId: id,
    branchId: order.branchId,
    type: legType,
    status: "assigned",
    driverId,
    driverName: `${driver.firstName} ${driver.lastName}`.trim(),
    driverPhone: driver.phone ?? null,
  }).returning();

  // Advance order status
  await db.update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, id));
  await db.insert(orderStatusHistory).values({
    orderId: id,
    status: newStatus,
    notes: `Driver assigned for ${legType}: ${driver.firstName} ${driver.lastName}`,
    changedBy: authUser.id,
  });

  return c.json({ success: true, data: { delivery, driverName: `${driver.firstName} ${driver.lastName}` } });
});

// PATCH /api/v1/orders/:id/transfer-branch
ordersRoutes.patch("/:id/transfer-branch", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const { branchId: newBranchId, notes } = body;
  if (!newBranchId) return c.json({ success: false, error: "branchId is required" }, 400);

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  if (["completed", "delivered", "cancelled"].includes(order.status)) {
    return c.json({ success: false, error: "Cannot transfer a completed, delivered, or cancelled order" }, 400);
  }

  const [newBranch] = await db.select().from(branches).where(eq(branches.id, newBranchId)).limit(1);
  if (!newBranch) return c.json({ success: false, error: "Target branch not found" }, 404);

  const authUser = c.get("authUser");
  const [updatedOrder] = await db.update(orders)
    .set({ branchId: newBranchId, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId: id,
    status: "transferred",
    notes: notes ?? `Transferred to ${newBranch.name}`,
    changedBy: authUser.id,
  });

  return c.json({ success: true, data: updatedOrder });
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

  // Fire-and-forget email notification
  if (order.customerId) {
    (async () => {
      try {
        const [customer] = await db
          .select({ email: customers.email, firstName: customers.firstName, lastName: customers.lastName, emailOrderUpdates: customers.emailOrderUpdates })
          .from(customers)
          .where(eq(customers.id, order.customerId!))
          .limit(1);

        if (customer?.email && customer.emailOrderUpdates === true) {
          const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, order.branchId)).limit(1);
          const customerName = `${customer.firstName} ${customer.lastName}`.trim();
          // For self-pickup orders that become ready, send the pickup-specific email
          const emailStatus = (status === "ready" && order.returnMethod === "self_pickup")
            ? "ready_self_pickup"
            : status;
          sendOrderStatusEmail({
            to: customer.email,
            customerName,
            orderNumber: order.orderNumber,
            trackingCode: order.orderNumber,
            status: emailStatus,
            branchName: branch?.name ?? undefined,
            total: order.total ? String(order.total) : undefined,
          }).catch(console.error);
        }
      } catch (err) {
        console.error("[email] Error fetching customer for status email:", err);
      }
    })();
  }

  return c.json({ success: true, data: order });
});

// DELETE /api/v1/orders/:id — superadmin hard delete with password confirmation
ordersRoutes.delete("/:id", authenticate, async (c) => {
  const id = c.req.param("id") as string;
  const authUser = c.get("authUser");

  if (authUser.role !== "superadmin") {
    return c.json({ success: false, error: "Only superadmins can delete orders" }, 403);
  }

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const { password } = body;
  if (!password) return c.json({ success: false, error: "Password required" }, 400);

  // Verify superadmin password
  const bcrypt = await import("bcryptjs");
  const [adminUser] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);
  if (!adminUser) return c.json({ success: false, error: "User not found" }, 404);

  const valid = await bcrypt.default.compare(password, adminUser.passwordHash as string);
  if (!valid) return c.json({ success: false, error: "Incorrect password" }, 401);

  // Check order exists
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  // Hard delete — cascade through related records
  await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, id));
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(deliveries).where(eq(deliveries.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));

  return c.json({ success: true, message: `Order ${order.orderNumber} deleted` });
});
