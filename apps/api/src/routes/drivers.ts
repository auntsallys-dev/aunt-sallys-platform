import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db, driverLocations, orders, orderItems, orderStatusHistory, services, customers, deliveries, branches, customerAddresses } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { wsManager } from "../ws-manager.js";

export const driversRoutes = new Hono();

// All driver routes require auth
driversRoutes.use("*", authenticate);

// POST /api/v1/drivers/location — GPS ping from driver app
driversRoutes.post("/location", async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const authUser = c.get("authUser");
  const { lat, lng, orderId, branchId: bodyBranchId } = body;

  if (!lat || !lng) return c.json({ success: false, error: "lat and lng required" }, 400);

  const branchId = bodyBranchId ?? authUser.branchId;
  if (!branchId) return c.json({ success: false, error: "branchId required" }, 400);

  const [loc] = await db.insert(driverLocations).values({
    driverId: authUser.id,
    branchId,
    orderId: orderId ?? null,
    lat: String(lat),
    lng: String(lng),
  }).returning();

  // Broadcast to branch channel
  const locationPayload = {
    type: "driver_location",
    driverId: authUser.id,
    branchId,
    orderId: orderId ?? null,
    lat,
    lng,
    timestamp: loc.createdAt,
  };

  wsManager.broadcast(`branch:${branchId}:drivers`, locationPayload);

  // Also broadcast to order-specific channel if orderId provided
  if (orderId) {
    wsManager.broadcast(`order:${orderId}:driver`, locationPayload);
  }

  return c.json({ success: true, data: loc });
});

// GET /api/v1/drivers/orders — orders assigned to this driver
driversRoutes.get("/orders", async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;

  if (!branchId) return c.json({ success: false, error: "No branch assigned" }, 400);

  // Get deliveries assigned to this driver
  const assignedDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.driverId, authUser.id))
    .orderBy(desc(deliveries.updatedAt));

  const assignedOrderIds = assignedDeliveries.map((d) => d.orderId);

  // Also get unassigned delivery orders for this branch (backwards compat)
  const allBranchOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.branchId, branchId))
    .orderBy(desc(orders.createdAt));

  const activeDeliveryOrders = allBranchOrders.filter((o) =>
    (o.orderType === "delivery" || o.orderType === "pickup") &&
    !["completed", "cancelled", "delivered"].includes(o.status)
  );

  // Merge: assigned orders first, then unassigned ones not already in the list
  const assignedOrders = activeDeliveryOrders.filter((o) => assignedOrderIds.includes(o.id));
  const unassignedOrders = activeDeliveryOrders.filter(
    (o) => !assignedOrderIds.includes(o.id)
  );

  const ordersToShow = [...assignedOrders, ...unassignedOrders];

  const enriched = await Promise.all(ordersToShow.map(async (order) => {
    let customerName = "Unknown";
    let customerPhone = null;
    if (order.customerId) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1);
      if (cust) {
        customerName = `${cust.firstName} ${cust.lastName}`.trim();
        customerPhone = cust.phone;
      }
    }

    const items = await db.select({
      id: orderItems.id,
      serviceId: orderItems.serviceId,
      customName: orderItems.customName,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      serviceName: services.name,
    })
    .from(orderItems)
    .leftJoin(services, eq(services.id, orderItems.serviceId))
    .where(eq(orderItems.orderId, order.id));

    const [delivery] = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, order.id))
      .orderBy(desc(deliveries.createdAt))
      .limit(1);

    // Enrich delivery with address details
    let enrichedDelivery: any = delivery ?? null;
    if (delivery?.addressId) {
      const [addr] = await db.select().from(customerAddresses)
        .where(eq(customerAddresses.id, delivery.addressId))
        .limit(1);
      if (addr) {
        enrichedDelivery = {
          ...delivery,
          addressLine: addr.addressLine,
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        };
      }
    }

    const isAssignedToMe = assignedOrderIds.includes(order.id);

    return { ...order, customerName, customerPhone, items, delivery: enrichedDelivery, isAssignedToMe };
  }));

  return c.json({ success: true, data: enriched });
});

// PATCH /api/v1/drivers/orders/:id/collect-payment
driversRoutes.patch("/orders/:id/collect-payment", async (c) => {
  const orderId = c.req.param("id");
  const authUser = c.get("authUser");
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const { paymentMethod } = body;
  if (!paymentMethod) return c.json({ success: false, error: "paymentMethod is required" }, 400);

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  const [updatedOrder] = await db.update(orders)
    .set({ paymentStatus: "paid", paymentMethod, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId,
    status: order.status,
    notes: `Payment collected via ${paymentMethod}`,
    changedBy: authUser.id,
  });

  return c.json({ success: true, data: updatedOrder });
});

// PATCH /api/v1/drivers/orders/:id/deliver — mark order as delivered
driversRoutes.patch("/orders/:id/deliver", async (c) => {
  const orderId = c.req.param("id");
  const authUser = c.get("authUser");

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  const [updatedOrder] = await db.update(orders)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  // Update delivery record
  await db.update(deliveries)
    .set({ status: "completed", completedAt: new Date(), driverId: authUser.id, updatedAt: new Date() })
    .where(eq(deliveries.orderId, orderId));

  return c.json({ success: true, data: updatedOrder });
});
