import { Hono } from "hono";
import { eq, desc, sql, ilike, or, gte, lte, and } from "drizzle-orm";
import { db, customers, orders, orderItems, services, users, branches } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";

export const adminRoutes = new Hono();

// Require at least branch_admin
adminRoutes.use("*", authenticate, async (c, next) => {
  const user = c.get("authUser");
  const allowed = ["branch_admin", "org_admin", "superadmin"];
  if (!allowed.includes(user.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  return await next();
});

// GET /api/v1/admin/customers?page=1&pageSize=20&sort=orders&search=xxx
adminRoutes.get("/customers", async (c) => {
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const pageSize = parseInt(c.req.query("pageSize") ?? "20", 10);
  const sort = c.req.query("sort") ?? "recent"; // recent | orders
  const search = c.req.query("search") ?? "";
  const offset = (page - 1) * pageSize;

  // Fetch all customers (with optional search filter)
  let customerList = await db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .orderBy(desc(customers.createdAt))
    .limit(500);

  // Apply search filter
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    customerList = customerList.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return fullName.includes(q) || (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q);
    });
  }

  // Enrich with order stats
  const enriched = await Promise.all(customerList.map(async (customer) => {
    const orderRows = await db
      .select({ id: orders.id, createdAt: orders.createdAt })
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt));

    return {
      ...customer,
      totalOrders: orderRows.length,
      lastOrderDate: orderRows[0]?.createdAt ?? null,
    };
  }));

  // Sort
  if (sort === "orders") {
    enriched.sort((a, b) => b.totalOrders - a.totalOrders);
  } else {
    enriched.sort((a, b) => {
      const aDate = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
      const bDate = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
      return bDate - aDate;
    });
  }

  const total = enriched.length;
  const paginated = enriched.slice(offset, offset + pageSize);

  return c.json({
    success: true,
    data: paginated,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
});

// GET /api/v1/admin/customers/:id — full detail with profile fields + last 5 orders
adminRoutes.get("/customers/:id", async (c) => {
  const authUser = c.get("authUser");
  const superOnly = ["superadmin", "org_admin"];
  if (!superOnly.includes(authUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const customerId = c.req.param("id") as string;
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return c.json({ success: false, error: "Customer not found" }, 404);

  const orderCount = await db.$count(orders, eq(orders.customerId, customerId));

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      orderType: orders.orderType,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  return c.json({
    success: true,
    data: {
      ...customer,
      orderCount,
      recentOrders,
    },
  });
});

// PATCH /api/v1/admin/customers/:id — update customer fields
adminRoutes.patch("/customers/:id", async (c) => {
  const authUser = c.get("authUser");
  const superOnly = ["superadmin", "org_admin"];
  if (!superOnly.includes(authUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const customerId = c.req.param("id") as string;
  const [existing] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!existing) return c.json({ success: false, error: "Customer not found" }, 404);

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const allowed = [
    "firstName", "lastName", "phone", "email", "notes",
    "gender", "age", "maritalStatus", "livesAlone", "housingType",
    "hasHelper", "frequentServices", "emailOrderUpdates", "emailPromos",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ success: false, error: "No valid fields to update" }, 400);
  }

  updates.updatedAt = new Date();

  const [updated] = await db
    .update(customers)
    .set(updates)
    .where(eq(customers.id, customerId))
    .returning();

  return c.json({ success: true, data: updated });
});

// GET /api/v1/admin/customers/:id/orders
adminRoutes.get("/customers/:id/orders", async (c) => {
  const customerId = c.req.param("id");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) return c.json({ success: false, error: "Customer not found" }, 404);

  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));

  const enriched = await Promise.all(orderList.map(async (order) => {
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

    const [branch] = await db
      .select({ name: branches.name })
      .from(branches)
      .where(eq(branches.id, order.branchId))
      .limit(1);

    return { ...order, items, branchName: branch?.name ?? "Unknown" };
  }));

  return c.json({
    success: true,
    data: {
      customer,
      orders: enriched,
    },
  });
});

// GET /api/v1/admin/drivers — list active drivers (staff/branch_admin) for a branch
adminRoutes.get("/drivers", async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;

  let driverList = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      branchId: users.branchId,
    })
    .from(users)
    .where(eq(users.isActive, true));

  // Filter to branch if provided
  if (branchId) {
    driverList = driverList.filter((u) => u.branchId === branchId && ["staff", "branch_admin"].includes(u.role));
  } else {
    driverList = driverList.filter((u) => ["staff", "branch_admin"].includes(u.role));
  }

  // Get latest location for each driver from driver_locations table
  // We'll return the list and let the client use WebSocket for real-time locations
  return c.json({ success: true, data: driverList });
});

// GET /api/v1/admin/drivers/locations — latest location per driver for a branch
adminRoutes.get("/drivers/locations", async (c) => {
  const authUser = c.get("authUser");
  const branchId = c.req.query("branchId") ?? authUser.branchId;

  if (!branchId) return c.json({ success: false, error: "branchId required" }, 400);

  // Get latest location per driver using raw SQL subquery
  const locations = await db.execute(sql`
    SELECT DISTINCT ON (dl.driver_id)
      dl.driver_id,
      dl.branch_id,
      dl.order_id,
      dl.lat,
      dl.lng,
      dl.created_at,
      u.first_name,
      u.last_name,
      u.phone
    FROM driver_locations dl
    JOIN users u ON u.id = dl.driver_id
    WHERE dl.branch_id = ${branchId}::uuid
    ORDER BY dl.driver_id, dl.created_at DESC
  `);

  return c.json({ success: true, data: Array.from(locations as any) });
});

// GET /api/v1/admin/analytics
adminRoutes.get("/analytics", async (c) => {
  const user = c.get("authUser");
  if (user.role !== "superadmin" && user.role !== "org_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const branchId = c.req.query("branchId") ?? null;
  const fromStr = c.req.query("from");
  const toStr = c.req.query("to");

  if (!fromStr || !toStr) {
    return c.json({ success: false, error: "Missing required params: from, to" }, 400);
  }

  // Build date range — treat from/to as PH local dates (UTC+8)
  const fromDate = new Date(`${fromStr}T00:00:00+08:00`);
  const toDate   = new Date(`${toStr}T23:59:59+08:00`);

  // Build filter conditions
  const conditions = [
    gte(orders.createdAt, fromDate),
    lte(orders.createdAt, toDate),
  ];
  if (branchId) conditions.push(eq(orders.branchId, branchId));

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Fetch all orders in range
  const allOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      orderType: orders.orderType,
      branchId: orders.branchId,
      customerId: orders.customerId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(whereClause)
    .orderBy(desc(orders.createdAt));

  const activeOrders = allOrders.filter((o) => o.status !== "cancelled");
  const totalRevenue = activeOrders.reduce((s, o) => s + parseFloat(o.total as string), 0);
  const totalOrders  = allOrders.length;
  const completedOrders = allOrders.filter((o) => ["delivered", "completed", "collected"].includes(o.status)).length;
  const cancelledOrders = allOrders.filter((o) => o.status === "cancelled").length;
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;

  // New customers in date range
  const customerConditions = [gte(customers.createdAt, fromDate), lte(customers.createdAt, toDate)];
  const newCustomers = await db.$count(customers, and(...customerConditions));

  // Orders by status
  const statusMap: Record<string, number> = {};
  for (const o of allOrders) {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
  }
  const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Orders by type
  const typeMap: Record<string, number> = {};
  for (const o of allOrders) {
    typeMap[o.orderType] = (typeMap[o.orderType] ?? 0) + 1;
  }
  const ordersByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  // Revenue by day — group by PH-local date
  const dayMap: Record<string, { revenue: number; orders: number }> = {};
  for (const o of activeOrders) {
    const ph = new Date((o.createdAt as Date).getTime() + 8 * 60 * 60 * 1000);
    const dateStr = ph.toISOString().split("T")[0];
    if (!dayMap[dateStr]) dayMap[dateStr] = { revenue: 0, orders: 0 };
    dayMap[dateStr].revenue += parseFloat(o.total as string);
    dayMap[dateStr].orders  += 1;
  }
  const revenueByDay = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders }));

  // Top services
  const orderIds = allOrders.map((o) => o.id);
  let topServices: { name: string; quantity: number; revenue: number }[] = [];
  if (orderIds.length > 0) {
    const itemRows = await db
      .select({
        serviceName: services.name,
        customName: orderItems.customName,
        totalPrice: orderItems.totalPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(
        sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );

    const svcMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const row of itemRows) {
      const name = row.serviceName ?? row.customName ?? "Unknown";
      if (!svcMap[name]) svcMap[name] = { quantity: 0, revenue: 0 };
      svcMap[name].quantity += parseFloat(row.quantity as string);
      svcMap[name].revenue  += parseFloat(row.totalPrice as string);
    }
    topServices = Object.entries(svcMap)
      .map(([name, v]) => ({ name, quantity: Math.round(v.quantity * 100) / 100, revenue: Math.round(v.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  // Full orders list enriched with customer + branch name
  const branchList = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchMap: Record<string, string> = {};
  for (const b of branchList) branchMap[b.id] = b.name;

  // Fetch customer names for orders that have customerId
  const customerIds = [...new Set(allOrders.map((o) => o.customerId).filter(Boolean))] as string[];
  const customerMap: Record<string, string> = {};
  if (customerIds.length > 0) {
    const custRows = await db
      .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName })
      .from(customers)
      .where(
        sql`${customers.id} = ANY(ARRAY[${sql.join(customerIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );
    for (const c of custRows) customerMap[c.id] = `${c.firstName} ${c.lastName}`.trim();
  }

  // Build order items map for services summary per order
  const orderItemsMap: Record<string, string[]> = {};
  if (orderIds.length > 0) {
    const allItemRows = await db
      .select({
        orderId: orderItems.orderId,
        serviceName: services.name,
        customName: orderItems.customName,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(
        sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );
    for (const row of allItemRows) {
      const name = row.serviceName ?? row.customName ?? "Unknown";
      const qty  = parseFloat(row.quantity as string);
      const label = qty !== 1 ? `${name} x${qty}` : name;
      if (!orderItemsMap[row.orderId]) orderItemsMap[row.orderId] = [];
      orderItemsMap[row.orderId].push(label);
    }
  }

  const enrichedOrders = allOrders.map((o) => ({
    orderNumber: o.orderNumber,
    customerName: o.customerId ? (customerMap[o.customerId] ?? "Guest") : "Guest",
    branchName: branchMap[o.branchId] ?? "Unknown",
    status: o.status,
    orderType: o.orderType,
    total: parseFloat(o.total as string).toFixed(2),
    createdAt: (o.createdAt as Date).toISOString(),
    services: (orderItemsMap[o.id] ?? []).join(", ") || "—",
  }));

  return c.json({
    success: true,
    data: {
      summary: { totalOrders, totalRevenue, avgOrderValue, newCustomers, completedOrders, cancelledOrders },
      ordersByStatus,
      ordersByType,
      revenueByDay,
      topServices,
      orders: enrichedOrders,
    },
  });
});
