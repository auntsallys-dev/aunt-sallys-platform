import { Hono } from "hono";
import { eq, gte, lte, and, sql, desc } from "drizzle-orm";
import { db, orders, orderItems, services, branches, customers } from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";

export const analyticsRoutes = new Hono();

// Only admin / superadmin
analyticsRoutes.use("*", authenticate, async (c, next) => {
  const user = c.get("authUser");
  if (user.role !== "admin" && user.role !== "superadmin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  return await next();
});

function startOf(period: "today" | "week" | "month"): Date {
  // Use PH timezone (UTC+8)
  const now = new Date();
  const ph = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = ph.getUTCFullYear(), m = ph.getUTCMonth(), d = ph.getUTCDate();
  if (period === "today") return new Date(Date.UTC(y, m, d) - 8 * 3600 * 1000);
  if (period === "week")  return new Date(Date.UTC(y, m, d - 6) - 8 * 3600 * 1000);
  return new Date(Date.UTC(y, m, 1) - 8 * 3600 * 1000);
}

// GET /api/v1/analytics/overview
analyticsRoutes.get("/overview", async (c) => {
  const period = (c.req.query("period") ?? "month") as "today" | "week" | "month";
  const since = startOf(period);

  // All orders in period
  const allOrders = await db
    .select({
      id: orders.id,
      total: orders.total,
      status: orders.status,
      branchId: orders.branchId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(gte(orders.createdAt, since));

  const activeOrders = allOrders.filter((o) => o.status !== "cancelled");

  const totalRevenue = activeOrders.reduce((s, o) => s + parseFloat(o.total as string), 0);
  const totalOrders  = activeOrders.length;

  // Customers created in period
  const newCustomers = await db.$count(customers, gte(customers.createdAt, since));

  // Per-branch breakdown
  const branchList = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchStats = branchList.map((b) => {
    const bOrders = activeOrders.filter((o) => o.branchId === b.id);
    const revenue = bOrders.reduce((s, o) => s + parseFloat(o.total as string), 0);
    return { id: b.id, name: b.name, orders: bOrders.length, revenue };
  }).sort((a, b) => b.revenue - a.revenue);

  // Top services by revenue in period
  const orderIds = activeOrders.map((o) => o.id);
  let topServices: { name: string; revenue: number; count: number }[] = [];
  if (orderIds.length > 0) {
    const itemRows = await db
      .select({
        serviceName: services.name,
        totalPrice: orderItems.totalPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(
        sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(orderIds.map((id) => sql`${id}::uuid`), sql`, `)}])`
      );

    const svcMap: Record<string, { revenue: number; count: number }> = {};
    for (const row of itemRows) {
      const name = row.serviceName ?? "Unknown";
      if (!svcMap[name]) svcMap[name] = { revenue: 0, count: 0 };
      svcMap[name].revenue += parseFloat(row.totalPrice as string);
      svcMap[name].count   += parseFloat(row.quantity as string);
    }
    topServices = Object.entries(svcMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  // Recent orders (last 20 across all branches)
  const recent = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      branchId: orders.branchId,
      status: orders.status,
      total: orders.total,
      orderType: orders.orderType,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(sql`${orders.createdAt} DESC`)
    .limit(20);

  // Enrich with branch name
  const branchMap: Record<string, string> = {};
  for (const b of branchList) branchMap[b.id] = b.name;

  const recentEnriched = recent.map((o) => ({
    ...o,
    branchName: branchMap[o.branchId] ?? "Unknown",
  }));

  return c.json({
    success: true,
    data: {
      period,
      summary: { totalRevenue, totalOrders, newCustomers },
      branchStats,
      topServices,
      recentOrders: recentEnriched,
    },
  });
});

// GET /api/v1/analytics/full — full analytics with date range + branch filter (for new dashboard)
analyticsRoutes.get("/full", async (c) => {
  const user = c.get("authUser");
  if (user.role !== "superadmin" && user.role !== "org_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const branchId = c.req.query("branchId") ?? null;
  const fromStr = c.req.query("from");
  const toStr = c.req.query("to");
  if (!fromStr || !toStr) return c.json({ success: false, error: "Missing required params: from, to" }, 400);

  const fromDate = new Date(`${fromStr}T00:00:00+08:00`);
  const toDate = new Date(`${toStr}T23:59:59+08:00`);

  const conditions: any[] = [gte(orders.createdAt, fromDate), lte(orders.createdAt, toDate)];
  if (branchId) conditions.push(eq(orders.branchId, branchId));
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const allOrders = await db.select({
    id: orders.id, orderNumber: orders.orderNumber, total: orders.total,
    status: orders.status, orderType: orders.orderType, branchId: orders.branchId,
    customerId: orders.customerId, createdAt: orders.createdAt,
  }).from(orders).where(whereClause).orderBy(desc(orders.createdAt));

  const activeOrders = allOrders.filter(o => o.status !== "cancelled");
  const totalRevenue = activeOrders.reduce((s, o) => s + parseFloat(o.total as string), 0);
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter(o => ["delivered","completed","collected"].includes(o.status)).length;
  const cancelledOrders = allOrders.filter(o => o.status === "cancelled").length;
  const avgOrderValue = activeOrders.length ? totalRevenue / activeOrders.length : 0;

  const custConditions: any[] = [gte(customers.createdAt, fromDate), lte(customers.createdAt, toDate)];
  if (branchId) { /* skip branch filter for customers */ }
  const newCustomers = await db.$count(customers, and(...custConditions));

  const branchList = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const branchMap: Record<string, string> = {};
  for (const b of branchList) branchMap[b.id] = b.name;

  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    typeCounts[o.orderType] = (typeCounts[o.orderType] || 0) + 1;
  }

  const revByDay: Record<string, { revenue: number; orders: number }> = {};
  for (const o of activeOrders) {
    const d = new Date(new Date(o.createdAt).getTime() + 8 * 3600 * 1000).toISOString().split("T")[0];
    if (!revByDay[d]) revByDay[d] = { revenue: 0, orders: 0 };
    revByDay[d].revenue += parseFloat(o.total as string);
    revByDay[d].orders += 1;
  }

  const orderIds = activeOrders.map(o => o.id);
  let topServices: any[] = [];
  if (orderIds.length > 0) {
    const itemRows = await db.select({
      serviceName: services.name, totalPrice: orderItems.totalPrice, quantity: orderItems.quantity,
    }).from(orderItems).leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(sql`${orderItems.orderId} = ANY(ARRAY[${sql.join(orderIds.map(id => sql`${id}::uuid`), sql`, `)}])`);
    const svcMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const row of itemRows) {
      const name = row.serviceName ?? "Unknown";
      if (!svcMap[name]) svcMap[name] = { revenue: 0, quantity: 0 };
      svcMap[name].revenue += parseFloat(row.totalPrice as string);
      svcMap[name].quantity += parseFloat(row.quantity as string);
    }
    topServices = Object.entries(svcMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }

  const enrichedOrders = await Promise.all(allOrders.map(async (o) => {
    let customerName = "Walk-in";
    if (o.customerId) {
      const [cust] = await db.select({ firstName: customers.firstName, lastName: customers.lastName })
        .from(customers).where(eq(customers.id, o.customerId)).limit(1);
      if (cust) customerName = `${cust.firstName} ${cust.lastName}`.trim();
    }
    const items = await db.select({ serviceName: services.name, quantity: orderItems.quantity })
      .from(orderItems).leftJoin(services, eq(services.id, orderItems.serviceId))
      .where(eq(orderItems.orderId, o.id));
    const servicesSummary = items.map(i => `${i.serviceName} x${i.quantity}`).join(", ");
    return { ...o, customerName, branchName: branchMap[o.branchId] ?? "Unknown", services: servicesSummary };
  }));

  return c.json({ success: true, data: {
    summary: { totalOrders, totalRevenue, avgOrderValue, newCustomers, completedOrders, cancelledOrders },
    ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    ordersByType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
    revenueByDay: Object.entries(revByDay).sort(([a],[b])=>a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
    topServices,
    orders: enrichedOrders,
  }});
});
