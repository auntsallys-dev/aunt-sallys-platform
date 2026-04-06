import { Hono } from "hono";
import { eq, ilike, and, desc, or, ne } from "drizzle-orm";
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
  deliveries,
  driverLocations,
} from "@aunt-sallys/db";
import { formatOrderNumber } from "@aunt-sallys/shared";

export const publicRoutes = new Hono();

// GET /api/v1/public/branches
publicRoutes.get("/branches", async (c) => {
  const list = await db
    .select({
      id: branches.id,
      name: branches.name,
      slug: branches.slug,
      address: branches.address,
      phone: branches.phone,
      secondaryPhone: branches.secondaryPhone,
      operatingHours: branches.operatingHours,
    })
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

  const {
    name, phone, email, address, addressLat, addressLng, branchId, items, notes: driverNotes,
    gender, age, maritalStatus, livesAlone, housingType, hasHelper, frequentServices,
    emailOrderUpdates, emailPromos,
  } = body as {
    name: string;
    phone: string;
    email?: string;
    address: string;
    addressLat?: number;
    addressLng?: number;
    branchId: string;
    notes?: string;
    items: { serviceId: string; quantity: number; unitPrice: number; notes?: string }[];
    gender?: string;
    age?: number;
    maritalStatus?: string;
    livesAlone?: boolean;
    housingType?: string;
    hasHelper?: boolean;
    frequentServices?: string[];
    emailOrderUpdates?: boolean;
    emailPromos?: boolean;
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

  // Profile fields helper
  const profileFields = {
    ...(gender !== undefined && { gender }),
    ...(age !== undefined && { age }),
    ...(maritalStatus !== undefined && { maritalStatus }),
    ...(livesAlone !== undefined && { livesAlone }),
    ...(housingType !== undefined && { housingType }),
    ...(hasHelper !== undefined && { hasHelper }),
    ...(frequentServices !== undefined && { frequentServices }),
    ...(emailOrderUpdates !== undefined && { emailOrderUpdates }),
    ...(emailPromos !== undefined && { emailPromos }),
  };

  if (existing) {
    // Update profile fields if provided
    if (Object.keys(profileFields).length > 0) {
      await db.update(customers).set(profileFields).where(eq(customers.id, existing.id));
    }
    customer = existing;
  } else {
    const parts = name.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "-";
    const [created] = await db
      .insert(customers)
      .values({ orgId, firstName, lastName, phone, email: email || undefined, ...profileFields })
      .returning();
    customer = created;
  }

  // Duplicate check: same name but different phone, OR same phone but different name
  const fullNameLower = name.trim().toLowerCase();
  let needsClarification = false;

  // Check name conflict: another customer with same first name but different phone
  const [nameDuplicate] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        ne(customers.id, customer.id),
        ilike(customers.firstName, name.trim().split(" ")[0]),
        ne(customers.phone, phone),
      )
    )
    .limit(1);

  // Check phone conflict: same phone but stored name differs from submitted name
  const storedName = `${customer.firstName} ${customer.lastName}`.trim().toLowerCase();

  if (nameDuplicate) needsClarification = true;
  if (storedName !== fullNameLower && existing) needsClarification = true;

  // Create address record for pickup (with coords if provided)
  let addressId: string | undefined;
  if (address?.trim()) {
    const [addr] = await db
      .insert(customerAddresses)
      .values({
        customerId: customer.id,
        label: "booking",
        addressLine: address.trim(),
        lat: addressLat ? String(addressLat) : null,
        lng: addressLng ? String(addressLng) : null,
      })
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
      notes: item.notes ?? undefined,
    });
  }

  // Auto-add logistics fee if not already included
  const [logisticsSvc] = await db.select().from(services)
    .where(and(eq(services.category, "logistics"), eq(services.isActive, true)))
    .limit(1);

  const hasLogistics = logisticsSvc ? itemsToInsert.some((i) => i.serviceId === logisticsSvc.id) : false;
  if (logisticsSvc && !hasLogistics) {
    const logisticsPrice = parseFloat(logisticsSvc.basePrice as string);
    itemsToInsert.push({
      serviceId: logisticsSvc.id,
      quantity: "1",
      unitPrice: String(logisticsPrice),
      totalPrice: String(logisticsPrice),
      notes: "Auto-added: website delivery booking",
    });
    subtotal += logisticsPrice;
  }

  // Generate order number
  const count = await db.$count(orders);
  const year = new Date().getFullYear();
  const orderNumber = formatOrderNumber(year, count + 1);

  const notesLines: string[] = [`Online booking via auntsallyslaundry.com. Pickup address: ${address}`];
  if (driverNotes?.trim()) notesLines.push(`Driver notes: ${driverNotes.trim()}`);

  // If existing customer with name mismatch, record what was typed
  const bookedAs = (needsClarification && existing && storedName !== fullNameLower)
    ? name.trim()
    : undefined;

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      branchId,
      customerId: customer.id,
      orderType: "delivery",
      subtotal: String(subtotal),
      deliveryFee: "0",
      total: String(subtotal), // subtotal already includes logistics if auto-added
      notes: notesLines.join("\n"),
      pickupAddressId: addressId,
      needsClarification,
      bookedAs: bookedAs ?? null,
    })
    .returning();

  await db.insert(orderItems).values(itemsToInsert.map((i) => ({ ...i, orderId: order.id })));
  await db.insert(orderStatusHistory).values({ orderId: order.id, status: "pending" });

  // Create delivery record so driver can see address + coords
  await db.insert(deliveries).values({
    orderId: order.id,
    branchId,
    type: "pickup",
    status: "pending",
    notes: driverNotes?.trim() || null,
    addressId: addressId || null,
  });

  return c.json({ success: true, data: { trackingCode: order.orderNumber, orderId: order.id } }, 201);
});

// GET /api/v1/public/driver-location/:orderId
publicRoutes.get("/driver-location/:orderId", async (c) => {
  const orderId = c.req.param("orderId");

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return c.json({ success: false, error: "Order not found" }, 404);

  if (order.status !== "out_for_delivery") {
    return c.json({ success: true, data: null });
  }

  // Get the delivery record to find the driver
  const [delivery] = await db.select().from(deliveries)
    .where(eq(deliveries.orderId, orderId))
    .limit(1);

  if (!delivery?.driverId) {
    return c.json({ success: true, data: null });
  }

  // Find latest driver location entry for this driver+order
  const [loc] = await db.select().from(driverLocations)
    .where(and(eq(driverLocations.driverId, delivery.driverId), eq(driverLocations.orderId, orderId)))
    .orderBy(desc(driverLocations.createdAt))
    .limit(1);

  if (!loc) {
    // Fallback: latest location for driver regardless of order
    const [anyLoc] = await db.select().from(driverLocations)
      .where(eq(driverLocations.driverId, delivery.driverId))
      .orderBy(desc(driverLocations.createdAt))
      .limit(1);
    if (!anyLoc) return c.json({ success: true, data: null });
    return c.json({ success: true, data: { lat: parseFloat(anyLoc.lat as string), lng: parseFloat(anyLoc.lng as string), updatedAt: anyLoc.createdAt } });
  }

  return c.json({ success: true, data: { lat: parseFloat(loc.lat as string), lng: parseFloat(loc.lng as string), updatedAt: loc.createdAt } });
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

// GET /api/v1/public/geocode?q=... — proxy Nominatim to avoid browser CORS
publicRoutes.get("/geocode", async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length < 3) return c.json({ success: true, data: [] });
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=ph&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AuntSallysLaundry/1.0 (auntsallyslaundry.com)",
        "Accept-Language": "en",
      },
    });
    const data = await res.json();
    return c.json({ success: true, data });
  } catch {
    return c.json({ success: true, data: [] });
  }
});
