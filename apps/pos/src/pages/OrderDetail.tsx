import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const STATUS_STEPS = ["pending", "confirmed", "processing", "ready", "completed"];
const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", next: "confirmed", nextLabel: "Confirm Order" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", next: "processing", nextLabel: "Start Processing" },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800", next: "ready", nextLabel: "Mark Ready" },
  ready: { label: "Ready for Pickup", color: "bg-green-100 text-green-800", next: "completed", nextLabel: "Complete Order" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", next: "completed", nextLabel: "Mark Delivered" },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);

  async function fetchOrder() {
    if (!id) return;
    try {
      const res = await api.orders.get(id);
      setOrder(res.data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  async function advanceStatus() {
    if (!order) return;
    const config = STATUS_CONFIG[order.status];
    if (!config.next) return;
    setUpdating(true);
    try {
      await api.orders.updateStatus(order.id, config.next);
      await fetchOrder();
    } catch (err: any) {
      setError(err.message ?? "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function collectPayment() {
    if (!order) return;
    setPaymentLoading(true);
    try {
      await api.payments.create({
        orderId: order.id,
        amount: parseFloat(order.total),
        method: paymentMethod,
      });
      setShowPayment(false);
      await fetchOrder();
    } catch (err: any) {
      setError(err.message ?? "Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="animate-pulse text-gray-400">Loading order…</div></div>;
  }
  if (error && !order) {
    return <div className="p-6 text-red-600">{error}</div>;
  }
  if (!order) return null;

  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back
      </button>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="font-mono text-sm text-gray-500">{order.orderNumber}</div>
          <h1 className="text-2xl font-bold text-gray-900">{order.customerName}</h1>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {new Date(order.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${config.color}`}>{config.label}</span>
      </div>

      {/* Status progress */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-1 items-center">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= currentStep ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`h-1 flex-1 ${i < currentStep ? "bg-brand-600" : "bg-gray-100"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          {STATUS_STEPS.map((step) => (
            <div key={step} className="text-center capitalize" style={{ flex: 1 }}>
              {step.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      </div>

      {/* Order details */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900">Order Items</h2>
        <div className="space-y-2">
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <div className="font-medium text-gray-800">{item.serviceName}</div>
                <div className="text-xs text-gray-400">&times;{item.quantity} {item.priceUnit} @ &#8369;{parseFloat(item.unitPrice).toFixed(2)}</div>
              </div>
              <div className="font-semibold text-gray-900">&#8369;{parseFloat(item.totalPrice).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>&#8369;{parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(order.deliveryFee ?? "0") > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Delivery fee</span>
              <span>&#8369;{parseFloat(order.deliveryFee).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900">
            <span>Total</span>
            <span className="text-brand-700">&#8369;{parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment status */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Payment</div>
            <div className="text-sm text-gray-500 capitalize">{order.paymentMethod} · {order.paymentStatus}</div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
          }`}>
            {order.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {order.paymentStatus !== "paid" && (
          <button
            onClick={() => setShowPayment(true)}
            className="flex-1 rounded-xl border border-brand-400 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
          >
            Collect Payment
          </button>
        )}
        {config.next && (
          <button
            disabled={updating}
            onClick={advanceStatus}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {updating ? "Updating…" : config.nextLabel}
          </button>
        )}
      </div>

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Collect Payment</h2>
            <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-500">Amount due</div>
              <div className="text-2xl font-bold text-gray-900">&#8369;{parseFloat(order.total).toFixed(2)}</div>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={paymentLoading}
                onClick={collectPayment}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {paymentLoading ? "Processing…" : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
