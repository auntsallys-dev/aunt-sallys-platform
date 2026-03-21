import { useState } from "react";

type OrderStatus = "pending" | "confirmed" | "processing" | "ready" | "completed" | "cancelled";

const ORDERS = [
  { id: "1", number: "AS-2026-00024", customer: "Maria Santos", branch: "Mandaue", total: "₱325", status: "processing" as OrderStatus, date: "Mar 18, 2026", type: "walk_in" },
  { id: "2", number: "AS-2026-00023", customer: "Juan Dela Cruz", branch: "IT Park", total: "₱450", status: "ready" as OrderStatus, date: "Mar 18, 2026", type: "delivery" },
  { id: "3", number: "AS-2026-00022", customer: "Ana Reyes", branch: "Consolacion", total: "₱180", status: "completed" as OrderStatus, date: "Mar 17, 2026", type: "walk_in" },
  { id: "4", number: "AS-2026-00021", customer: "Carlos Tan", branch: "Lapu-Lapu", total: "₱640", status: "pending" as OrderStatus, date: "Mar 18, 2026", type: "pickup" },
  { id: "5", number: "AS-2026-00020", customer: "Rosa Garcia", branch: "Mandaue", total: "₱290", status: "cancelled" as OrderStatus, date: "Mar 17, 2026", type: "walk_in" },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const filtered = ORDERS.filter((o) => {
    const matchSearch =
      o.number.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      </div>

      {/* Filters */}
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
          <option value="all">All Statuses</option>
          {(["pending", "confirmed", "processing", "ready", "completed", "cancelled"] as OrderStatus[]).map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{o.number}</td>
                <td className="px-4 py-3 text-gray-700">{o.customer}</td>
                <td className="px-4 py-3 text-gray-600">{o.branch}</td>
                <td className="px-4 py-3 capitalize text-gray-500">{o.type.replace("_", " ")}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{o.total}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{o.date}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
