import { Hono } from "hono";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db, driverLocations, orders, orderItems, orderStatusHistory, services, customers, deliveries, branches, customerAddresses, users } from "@aunt-sallys/db";
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

// GET /api/v1/drivers/orders — split queue: available_pickup, available_delivery, my_orders
driversRoutes.get("/orders", async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;

  if (!branchId) return c.json({ success: false, error: "No branch assigned" }, 400);

  // All deliveries assigned to this driver
  const myDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.driverId, authUser.id))
    .orderBy(desc(deliveries.updatedAt));

  const myOrderIds = myDeliveries.map((d) => d.orderId);

  // All branch orders (active)
  const allBranchOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.branchId, branchId))
    .orderBy(desc(orders.createdAt));

  // All delivery legs for this branch to detect unassigned orders
  const allDeliveries = await db
    .select()
    .from(deliveries)
    .where(eq(deliveries.branchId, branchId));

  // Build sets of order IDs that have a driver assigned for each leg type
  const assignedPickupOrderIds = new Set(
    allDeliveries.filter((d) => d.type === "pickup" && d.driverId !== null).map((d) => d.orderId)
  );
  const assignedDeliveryOrderIds = new Set(
    allDeliveries.filter((d) => d.type === "delivery" && d.driverId !== null).map((d) => d.orderId)
  );

  // Categorise orders
  const availablePickupOrders = allBranchOrders.filter((o) =>
    (o.orderType === "delivery" || o.orderType === "pickup") &&
    o.status === "confirmed" &&
    !assignedPickupOrderIds.has(o.id)
  );

  const availableDeliveryOrders = allBranchOrders.filter((o) =>
    (o.orderType === "delivery" || o.orderType === "pickup") &&
    o.status === "ready" &&
    !assignedDeliveryOrderIds.has(o.id)
  );

  const myActiveOrders = allBranchOrders.filter((o) =>
    myOrderIds.includes(o.id) &&
    !["completed", "cancelled", "delivered"].includes(o.status)
  );

  async function enrichOrder(order: (typeof allBranchOrders)[0]) {
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

    // Get all delivery legs for this order
    const orderDeliveries = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.orderId, order.id))
      .orderBy(desc(deliveries.createdAt));

    // Most recent leg for map/address enrichment
    const latestDelivery = orderDeliveries[0] ?? null;
    let enrichedDelivery: any = latestDelivery ?? {};

    // Try to get address from delivery leg first
    if (latestDelivery?.addressId) {
      const [addr] = await db.select().from(customerAddresses)
        .where(eq(customerAddresses.id, latestDelivery.addressId))
        .limit(1);
      if (addr) {
        enrichedDelivery = {
          ...latestDelivery,
          addressLine: addr.addressLine,
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        };
      }
    }

    // Always enrich with order-level address (pickupAddressId / deliveryAddressId)
    // so address shows even before a delivery leg exists (e.g. pickup queue)
    if (!enrichedDelivery.addressLine) {
      const addrId = order.pickupAddressId ?? order.deliveryAddressId ?? null;
      if (addrId) {
        const [addr] = await db.select().from(customerAddresses)
          .where(eq(customerAddresses.id, addrId))
          .limit(1);
        if (addr) {
          enrichedDelivery = {
            ...enrichedDelivery,
            addressLine: addr.addressLine,
            lat: addr.lat ?? null,
            lng: addr.lng ?? null,
          };
        }
      }
    }

    // Final fallback: use notes if available
    if (!enrichedDelivery.addressLine && order.notes) {
      enrichedDelivery = { ...enrichedDelivery, addressLine: order.notes.split("\n")[0] };
    }

    // Check if I did the pickup leg (for ⭐ badge)
    const didPickup = orderDeliveries.some((d) => d.type === "pickup" && d.driverId === authUser.id);

    return { ...order, customerName, customerPhone, items, delivery: enrichedDelivery, didPickup };
  }

  const [available_pickup, available_delivery, my_orders] = await Promise.all([
    Promise.all(availablePickupOrders.map(enrichOrder)),
    Promise.all(availableDeliveryOrders.map(enrichOrder)),
    Promise.all(myActiveOrders.map(enrichOrder)),
  ]);

  return c.json({ success: true, data: { available_pickup, available_delivery, my_orders } });
});

// PATCH /api/v1/drivers/orders/:id/self-assign — driver claims an order
driversRoutes.patch("/orders/:id/self-assign", async (c) => {
  const orderId = c.req.param("id") as string;
  const authUser = c.get("authUser");

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

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
    return c.json({ success: false, error: `Cannot self-assign when order status is '${order.status}'` }, 400);
  }

  // Double-assign guard
  const existingLegs = await db.select().from(deliveries).where(eq(deliveries.orderId, orderId));
  const alreadyAssigned = existingLegs.find((d) => d.type === legType && d.driverId !== null);
  if (alreadyAssigned) {
    return c.json({ success: false, error: `A driver is already assigned for the ${legType} leg` }, 409);
  }

  const [driver] = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1);

  const [delivery] = await db.insert(deliveries).values({
    orderId,
    branchId: order.branchId,
    type: legType,
    status: "assigned",
    driverId: authUser.id,
    driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : null,
    driverPhone: driver?.phone ?? null,
  }).returning();

  const [updatedOrder] = await db.update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await db.insert(orderStatusHistory).values({
    orderId,
    status: newStatus,
    notes: `Driver self-assigned for ${legType}: ${driver ? `${driver.firstName} ${driver.lastName}` : authUser.id}`,
    changedBy: authUser.id,
  });

  return c.json({ success: true, data: { order: updatedOrder, delivery } });
});

// PATCH /api/v1/drivers/orders/:id/mark-picked-up — driver advances order to processing
driversRoutes.patch("/orders/:id/mark-picked-up", async (c) => {
  const orderId = c.req.param("id") as string;
  const authUser = c.get("authUser");

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  if (order.status !== "out_for_pickup") {
    return c.json({ success: false, error: `Order must be 'out_for_pickup' to mark as picked up (current: ${order.status})` }, 400);
  }

  const [updatedOrder] = await db.update(orders)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  // Mark the pickup delivery leg as completed
  const pickupLegs = await db.select().from(deliveries)
    .where(and(eq(deliveries.orderId, orderId), eq(deliveries.type, "pickup")));
  if (pickupLegs.length > 0) {
    await db.update(deliveries)
      .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(deliveries.orderId, orderId), eq(deliveries.type, "pickup")));
  }

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "processing",
    notes: "Driver marked as picked up — order now processing",
    changedBy: authUser.id,
  });

  return c.json({ success: true, data: updatedOrder });
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

// PATCH /api/v1/drivers/orders/:id/pickup-photo — save pickup photo URL
driversRoutes.patch("/orders/:id/pickup-photo", async (c) => {
  const orderId = c.req.param("id") as string;
  const { photoUrl } = await c.req.json();
  if (!photoUrl) return c.json({ success: false, error: "photoUrl required" }, 400);
  const [updated] = await db.update(orders)
    .set({ pickupPhotoUrl: photoUrl, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();
  return c.json({ success: true, data: updated });
});

// PATCH /api/v1/drivers/orders/:id/delivery-photo — save delivery photo URL
driversRoutes.patch("/orders/:id/delivery-photo", async (c) => {
  const orderId = c.req.param("id") as string;
  const { photoUrl } = await c.req.json();
  if (!photoUrl) return c.json({ success: false, error: "photoUrl required" }, 400);
  const [updated] = await db.update(orders)
    .set({ deliveryPhotoUrl: photoUrl, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();
  return c.json({ success: true, data: updated });
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
