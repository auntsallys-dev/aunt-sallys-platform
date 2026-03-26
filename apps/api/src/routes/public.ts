import { Hono } from "hono";
import { eq, ilike } from "drizzle-orm";
import {
  db,
  orders,
  orderItems,
  orderStatusHistory,
  services,
  customers,
  branches,
  organizations,
  customerAddresses,
} from "@aunt-sallys/db";
import { formatOrderNumber } from "@aunt-sallys/shared";

export const publicRoutes = new Hono();

// GET /api/v1/public/branches
publicRoutes.get("/branches", async (c) => {
  const list = await db
    .select({ id: branches.id, name: branches.name, slug: branches.slug, address: branches.address })
    .from(branches)
    .where(eq(branches.isActive, true));
  return c.json({ success: true, data: list });
});

// GET /api/v1/public/services
publicRoutes.get("/services", async (c) => {
  const list = await db
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      basePrice: services.basePrice,
      priceUnit: services.priceUnit,
      description: services.description,
      estimatedHours: services.estimatedHours,
    })
    .from(services)
    .where(eq(services.isActive, true));
  return c.json({ success: true, data: list });
});

// POST /api/v1/public/bookings
publicRoutes.post("/bookings", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: "Invalid JSON" }, 400);
  }

  const { name, phone, email, address, branchId, items } = body as {
    name: string;
    phone: string;
    email?: string;
    address: string;
    branchId: string;
    items: { serviceId: string; quantity: number; unitPrice: number }[];
  };

  if (!name || !phone || !branchId || !items?.length) {
    return c.json({ success: false, error: "Missing required fields: name, phone, branchId, items" }, 400);
  }

  // Get org from branch
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branch) return c.json({ success: false, error: "Branch not found" }, 400);

  const orgId = branch.orgId;

  // Find or create customer by phone
  let customer;
  const [existing] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (existing) {
    customer = existing;
  } else {
    const parts = name.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "-";
    const [created] = await db
      .insert(customers)
      .values({ orgId, firstName, lastName, phone, email: email || undefined })
      .returning();
    customer = created;
  }

  // Create address record for pickup
  let addressId: string | undefined;
  if (address?.trim()) {
    const [addr] = await db
      .insert(customerAddresses)
      .values({ customerId: customer.id, label: "booking", addressLine: address.trim() })
      .returning();
    addressId = addr.id;
  }

  // Validate services and compute totals
  let subtotal = 0;
  const itemsToInsert: {
    serviceId: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    notes?: string;
  }[] = [];

  for (const item of items) {
    const [svc] = await db.select().from(services).where(eq(services.id, item.serviceId)).limit(1);
    if (!svc) return c.json({ success: false, error: `Service not found: ${item.serviceId}` }, 400);

    const unitPrice = parseFloat(svc.basePrice as string);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    itemsToInsert.push({
      serviceId: svc.id,
      quantity: String(item.quantity),
      unitPrice: String(unitPrice),
      totalPrice: String(totalPrice),
    });
  }

  // Generate order number
  const count = await db.$count(orders);
  const year = new Date().getFullYear();
  const orderNumber = formatOrderNumber(year, count + 1);

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      branchId,
      customerId: customer.id,
      orderType: "pickup",
      subtotal: String(subtotal),
      deliveryFee: "0",
      total: String(subtotal),
      notes: `Online booking via auntsallyslaundry.com. Pickup address: ${address}`,
      pickupAddressId: addressId,
    })
    .returning();

  await db.insert(orderItems).values(itemsToInsert.map((i) => ({ ...i, orderId: order.id })));
  await db.insert(orderStatusHistory).values({ orderId: order.id, status: "pending" });

  return c.json({ success: true, data: { trackingCode: order.orderNumber, orderId: order.id } }, 201);
});

// GET /api/v1/public/track/:code
publicRoutes.get("/track/:code", async (c) => {
  const code = c.req.param("code");
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, code))
    .limit(1);

  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id));

  const enrichedItems = await db
    .select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      serviceName: services.name,
    })
    .from(orderItems)
    .leftJoin(services, eq(services.id, orderItems.serviceId))
    .where(eq(orderItems.orderId, order.id));

  return c.json({
    success: true,
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      notes: order.notes,
      items: enrichedItems,
      history: history.map((h) => ({ status: h.status, createdAt: h.createdAt, notes: h.notes })),
    },
  });
});
