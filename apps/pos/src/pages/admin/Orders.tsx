import { useState, useEffect } from "react";
import { api } from "../../lib/api";

type OrderStatus = "pending" | "confirmed" | "processing" | "ready" | "completed" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUSES: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "processing", "ready", "completed", "cancelled"];

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    const params: any = {};
    if (statusFilter !== "all") params.status = statusFilter;
    api.orders.list(params)
      .then((res) => setOrders(res.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const num = (o.orderNumber ?? o.id ?? "").toLowerCase();
    const name = `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}`.toLowerCase();
    return num.includes(q) || name.includes(q);
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-400">{filtered.length} orders</span>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s === "all" ? "All Statuses" : s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Order #</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Branch</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders found.</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{o.orderNumber ?? o.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-700">{o.customer?.firstName} {o.customer?.lastName}</td>
                <td className="px-4 py-3 text-gray-600">{o.branch?.name ?? "—"}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{(o.type ?? "").replace("_", " ")}</td>
                <td className="px-4 py-3 font-medium text-gray-900">₱{Number(o.totalAmount ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
