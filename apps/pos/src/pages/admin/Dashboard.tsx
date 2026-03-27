import { useState, useEffect } from "react";
import { api } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.overview("today").catch(() => null),
      api.orders.list({ status: undefined }).catch(() => ({ data: [] })),
      api.branches.list().catch(() => ({ data: [] })),
    ]).then(([analytics, ordersRes, branchesRes]) => {
      setData(analytics?.data ?? null);
      setOrders((ordersRes?.data ?? []).slice(0, 5));
      setBranches(branchesRes?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Orders Today",
      value: loading ? "—" : String(data?.ordersToday ?? orders.length),
      delta: "live",
      color: "text-brand-600",
    },
    {
      label: "Revenue Today",
      value: loading ? "—" : `₱${Number(data?.revenueToday ?? 0).toLocaleString()}`,
      delta: "live",
      color: "text-green-600",
    },
    {
      label: "Active Orders",
      value: loading ? "—" : String(orders.filter((o) => !["completed","delivered","cancelled"].includes(o.status)).length),
      delta: "in progress",
      color: "text-orange-600",
    },
    {
      label: "Branches",
      value: loading ? "—" : String(branches.length),
      delta: "active",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-xs text-gray-400">{stat.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">No orders yet.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-mono text-sm font-medium text-gray-900">{o.orderNumber ?? o.id?.slice(0, 8)}</div>
                    <div className="text-sm text-gray-500">
                      {o.customer?.firstName} {o.customer?.lastName} · {o.branch?.name ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">₱{Number(o.totalAmount ?? 0).toLocaleString()}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch list */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Branches</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {branches.map((b) => (
                <div key={b.id} className="px-5 py-3">
                  <div className="text-sm font-medium text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-400">{b.address ?? "—"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
