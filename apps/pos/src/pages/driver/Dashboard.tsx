import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  pending:           "bg-yellow-100 text-yellow-700",
  confirmed:         "bg-blue-100 text-blue-700",
  out_for_pickup:    "bg-cyan-100 text-cyan-700",
  processing:        "bg-purple-100 text-purple-700",
  ready:             "bg-teal-100 text-teal-700",
  out_for_delivery:  "bg-indigo-100 text-indigo-700",
  delivered:         "bg-green-100 text-green-700",
};

interface OrderQueues {
  available_pickup: any[];
  available_delivery: any[];
  my_orders: any[];
}

function OrderCard({
  order,
  onClick,
  actionLabel,
  onAction,
  actionBusy,
  badge,
}: {
  order: any;
  onClick: () => void;
  actionLabel?: string;
  onAction?: (e: React.MouseEvent) => void;
  actionBusy?: boolean;
  badge?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</span>
          {badge && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{badge}</span>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
          {order.status.replace(/_/g, " ")}
        </span>
      </div>
      <div className="text-sm font-medium text-gray-800">{order.customerName}</div>
      {order.customerPhone && (
        <a
          href={`tel:${order.customerPhone}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 text-xs text-brand-600 hover:underline block"
        >
          {order.customerPhone}
        </a>
      )}
      <div className="mt-1 text-xs text-gray-400">
        {order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""} · ₱{parseFloat(order.total).toFixed(2)}
      </div>
      {actionLabel && onAction && (
        <button
          disabled={actionBusy}
          onClick={(e) => { e.stopPropagation(); onAction(e); }}
          className="mt-3 w-full rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {actionBusy ? "Processing…" : actionLabel}
        </button>
      )}
    </div>
  );
}

export function DriverDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [queues, setQueues] = useState<OrderQueues>({ available_pickup: [], available_delivery: [], my_orders: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "active" | "error">("idle");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchOrders() {
    try {
      const res = await api.driver.getOrders(user?.branchId ?? undefined);
      // Handle both new shape { available_pickup, available_delivery, my_orders }
      // and old flat array shape for backwards compat
      if (Array.isArray(res.data)) {
        setQueues({ available_pickup: [], available_delivery: [], my_orders: res.data as any[] });
      } else {
        setQueues(res.data as unknown as OrderQueues);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, []);

  function sendLocation(branchId: string, orderId?: string) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api.driver.postLocation(pos.coords.latitude, pos.coords.longitude, branchId, orderId)
          .catch(() => setGpsStatus("error"));
        setGpsStatus("active");
      },
      () => setGpsStatus("error")
    );
  }

  function toggleTracking() {
    if (!user?.branchId) return;
    if (tracking) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
      setTracking(false);
      setGpsStatus("idle");
    } else {
      sendLocation(user.branchId);
      gpsIntervalRef.current = setInterval(() => sendLocation(user.branchId!), 10_000);
      setTracking(true);
    }
  }

  useEffect(() => {
    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, []);

  async function handleSelfAssign(orderId: string) {
    setBusyIds((prev) => new Set(prev).add(orderId));
    try {
      await api.driver.selfAssign(orderId);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message ?? "Failed to claim order");
    } finally {
      setBusyIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
    }
  }

  async function handleMarkPickedUp(orderId: string) {
    setBusyIds((prev) => new Set(prev).add(orderId + "_pickup"));
    try {
      await api.driver.markPickedUp(orderId);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message ?? "Failed to mark picked up");
    } finally {
      setBusyIds((prev) => { const s = new Set(prev); s.delete(orderId + "_pickup"); return s; });
    }
  }

  const totalActive = queues.available_pickup.length + queues.available_delivery.length + queues.my_orders.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">{user?.firstName} {user?.lastName}</div>
            <div className="text-xs text-gray-400">{user?.role}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTracking}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                tracking ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tracking ? "● Tracking On" : "Start Tracking"}
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </div>
        </div>
        {gpsStatus === "error" && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">GPS unavailable — check location permissions</div>
        )}
      </header>

      <div className="px-4 py-5 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Orders</h1>
          <button
            onClick={() => { setLoading(true); fetchOrders(); }}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Refresh
          </button>
        </div>

        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading && <div className="py-12 text-center text-gray-400">Loading orders…</div>}

        {!loading && totalActive === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🚗</div>
            <p className="text-gray-500">No orders available.</p>
          </div>
        )}

        {/* Available for Pickup */}
        {queues.available_pickup.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              📦 Available for Pickup ({queues.available_pickup.length})
            </h2>
            <div className="space-y-3">
              {queues.available_pickup.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/driver/orders/${order.id}`)}
                  actionLabel="Claim Pickup"
                  onAction={() => handleSelfAssign(order.id)}
                  actionBusy={busyIds.has(order.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Ready for Delivery */}
        {queues.available_delivery.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              🚚 Ready for Delivery ({queues.available_delivery.length})
            </h2>
            <div className="space-y-3">
              {queues.available_delivery.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onClick={() => navigate(`/driver/orders/${order.id}`)}
                  actionLabel="Claim Delivery"
                  onAction={() => handleSelfAssign(order.id)}
                  actionBusy={busyIds.has(order.id)}
                  badge={order.didPickup ? "⭐ You handled the pickup" : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* My Active Orders */}
        {queues.my_orders.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              🗂 My Active Orders ({queues.my_orders.length})
            </h2>
            <div className="space-y-3">
              {queues.my_orders.map((order) => {
                let actionLabel: string | undefined;
                let onAction: (() => void) | undefined;
                let actionBusy = false;

                if (order.status === "out_for_pickup") {
                  actionLabel = "I've Picked Up";
                  onAction = () => handleMarkPickedUp(order.id);
                  actionBusy = busyIds.has(order.id + "_pickup");
                } else if (order.status === "out_for_delivery") {
                  actionLabel = "Mark Delivered";
                  onAction = () => navigate(`/driver/orders/${order.id}`);
                } else if (order.status === "ready") {
                  actionLabel = "Claim Delivery";
                  onAction = () => handleSelfAssign(order.id);
                  actionBusy = busyIds.has(order.id);
                }

                return (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => navigate(`/driver/orders/${order.id}`)}
                    actionLabel={actionLabel}
                    onAction={onAction ? (e) => { e.stopPropagation(); onAction!(); } : undefined}
                    actionBusy={actionBusy}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
