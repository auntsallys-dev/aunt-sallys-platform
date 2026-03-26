import { Hono } from "hono";
import { eq, gte, and, sql } from "drizzle-orm";
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
