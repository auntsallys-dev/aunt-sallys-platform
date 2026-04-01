import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  pending:              "bg-yellow-100 text-yellow-700",
  confirmed:            "bg-blue-100 text-blue-700",
  assigned_for_pickup:  "bg-indigo-100 text-indigo-700",
  processing:           "bg-purple-100 text-purple-700",
  ready:                "bg-teal-100 text-teal-700",
  out_for_delivery:     "bg-indigo-100 text-indigo-700",
};

export function DriverDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "active" | "error">("idle");
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // "Are you delivering?" prompt state
  const [deliveryPrompt, setDeliveryPrompt] = useState<any | null>(null);
  const prevOrdersRef = useRef<any[]>([]);

  async function fetchOrders() {
    try {
      const branchId = user?.branchId ?? undefined;
      const res = await api.driver.getOrders(branchId);
      const newOrders = res.data;

      // Check if any order flipped to out_for_delivery since last fetch
      const prev = prevOrdersRef.current;
      if (prev.length > 0) {
        for (const newOrder of newOrders) {
          const oldOrder = prev.find((o) => o.id === newOrder.id);
          if (
            newOrder.status === "out_for_delivery" &&
            oldOrder?.status !== "out_for_delivery" &&
            newOrder.isAssignedToMe
          ) {
            // Show prompt only if not already showing one
            setDeliveryPrompt((curr: any) => curr ?? newOrder);
          }
        }
      }

      prevOrdersRef.current = newOrders;
      setOrders(newOrders);
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
    const branchId = user?.branchId;
    if (!branchId) return;

    if (tracking) {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
      setTracking(false);
      setGpsStatus("idle");
    } else {
      sendLocation(branchId);
      gpsIntervalRef.current = setInterval(() => sendLocation(branchId), 10_000);
      setTracking(true);
    }
  }

  function startDeliveryTracking(order: any) {
    const branchId = user?.branchId;
    if (!branchId) return;
    // Start GPS tracking for this specific order
    sendLocation(branchId, order.id);
    if (!tracking) {
      gpsIntervalRef.current = setInterval(() => sendLocation(branchId, order.id), 10_000);
      setTracking(true);
    }
    setDeliveryPrompt(null);
    navigate(`/driver/orders/${order.id}`);
  }

  async function handleClaimOrder(order: any, e: React.MouseEvent) {
    e.stopPropagation();
    setClaimingId(order.id);
    try {
      await api.driver.selfAssign(order.id);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message ?? "Failed to claim order");
    } finally {
      setClaimingId(null);
    }
  }

  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-gray-400">Driver</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTracking}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                tracking
                  ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tracking ? "● Tracking On" : "Start Tracking"}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Sign Out
            </button>
          </div>
        </div>
        {gpsStatus === "error" && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
            GPS unavailable — check location permissions
          </div>
        )}
      </header>

      <div className="px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Delivery Orders</h1>
          <button
            onClick={() => { setLoading(true); fetchOrders(); }}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading && (
          <div className="py-12 text-center text-gray-400">Loading orders…</div>
        )}

        {!loading && orders.length === 0 && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🚗</div>
            <p className="text-gray-500">No delivery orders assigned.</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/driver/orders/${order.id}`)}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 active:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</span>
                  {order.isAssignedToMe && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">Assigned</span>
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
                  className="mt-1 text-xs text-brand-600 hover:underline"
                >
                  {order.customerPhone}
                </a>
              )}
              <div className="mt-1 text-xs text-gray-400">
                {order.items?.length ?? 0} item{order.items?.length !== 1 ? "s" : ""}
                {" · "}₱{parseFloat(order.total).toFixed(2)}
              </div>

              {/* Self-assign / Claim button for unassigned orders */}
              {!order.isAssignedToMe && (
                <button
                  onClick={(e) => handleClaimOrder(order, e)}
                  disabled={claimingId === order.id}
                  className="mt-3 w-full rounded-xl bg-brand-600 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
                >
                  {claimingId === order.id ? "Claiming…" : "🙋 Claim this Order"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* "Are you now delivering?" prompt */}
      {deliveryPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
            <div className="text-4xl mb-3">🚚</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Ready for Delivery!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Order <strong>{deliveryPrompt.orderNumber}</strong> is ready for delivery.
              Are you now delivering?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeliveryPrompt(null)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50"
              >
                Not Yet
              </button>
              <button
                onClick={() => startDeliveryTracking(deliveryPrompt)}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
              >
                ✅ Yes, Start Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
