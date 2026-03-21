import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

type OrderStatus = "pending" | "confirmed" | "processing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

interface QueueOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string;
  status: OrderStatus;
  orderType: string;
  paymentStatus: string;
  createdAt: string;
  items: Array<{ serviceName: string; quantity: string; priceUnit: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", next: "confirmed", nextLabel: "Confirm" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", next: "processing", nextLabel: "Start Processing" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800", next: "ready", nextLabel: "Mark Ready" },
  ready: { label: "Ready", color: "bg-green-100 text-green-800", next: "completed", nextLabel: "Complete" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", next: "completed", nextLabel: "Mark Delivered" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

const ACTIVE_STATUSES = ["pending", "confirmed", "processing", "ready", "out_for_delivery"];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function QueuePage() {
  const navigate = useNavigate();
  const { selectedBranchId } = useAuth();
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.orders.list({ branchId: selectedBranchId, date: today });
      setOrders(res.data);
      setError("");
    } catch (err: any) {
      setError(err.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function advanceStatus(id: string, nextStatus: string) {
    setUpdatingId(id);
    try {
      await api.orders.updateStatus(id, nextStatus);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message ?? "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === "active"
    ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
    : filter === "all"
    ? orders
    : orders.filter((o) => o.status === filter);

  const activeCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const activeTotal = ACTIVE_STATUSES.reduce((s, st) => s + (activeCounts[st] ?? 0), 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} orders today · {activeTotal} active</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchOrders}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            &#8635; Refresh
          </button>
          <button
            onClick={() => navigate("/orders/new")}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
          >
            + New Order
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      )}

      {/* Status filter tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("active")}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === "active" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Active ({activeTotal})
        </button>
        {(["pending", "confirmed", "processing", "ready"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === s ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {STATUS_CONFIG[s].label} {activeCounts[s] ? `(${activeCounts[s]})` : ""}
          </button>
        ))}
        <button
          onClick={() => setFilter("completed")}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === "completed" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Completed {activeCounts["completed"] ? `(${activeCounts["completed"]})` : ""}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === "all" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All ({orders.length})
        </button>
      </div>

      {/* Orders */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="font-medium">No orders</p>
          <p className="text-sm">No orders in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const servicesSummary = order.items?.map((i) => `${i.serviceName} ×${i.quantity}`).join(", ") ?? "—";
            return (
              <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="font-mono text-xs font-semibold text-gray-500">{order.orderNumber}</div>
                    <div className="font-bold text-gray-900">{order.customerName}</div>
                    <div className="mt-0.5 text-sm text-gray-500 line-clamp-1">{servicesSummary}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">&#8369;{parseFloat(order.total).toFixed(2)}</div>
                    <div className="text-xs text-gray-400">{timeAgo(order.createdAt)}</div>
                    <div className={`mt-1 text-xs font-medium ${order.paymentStatus === "paid" ? "text-green-600" : "text-orange-500"}`}>
                      {order.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Details
                    </button>
                    {config.next && (
                      <button
                        disabled={updatingId === order.id}
                        onClick={() => advanceStatus(order.id, config.next!)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                      >
                        {updatingId === order.id ? "…" : config.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
