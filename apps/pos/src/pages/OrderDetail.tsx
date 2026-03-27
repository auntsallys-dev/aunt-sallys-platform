import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

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

const NON_EDITABLE = ["completed", "delivered", "cancelled"];
const NON_CANCELLABLE = ["completed", "delivered", "cancelled"];

// ── Edit Order Modal ──────────────────────────────────────────────────────────

function EditOrderModal({
  order,
  onClose,
  onSaved,
}: {
  order: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [services, setServices] = useState<any[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [addItems, setAddItems] = useState<{ serviceId: string; name: string; quantity: number; unitPrice: number }[]>([]);
  const [extraCharges, setExtraCharges] = useState<{ name: string; price: number }[]>([]);
  const [extraName, setExtraName] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"items" | "extra">("items");

  useEffect(() => {
    api.services.list().then((res) => setServices(res.data)).catch(() => {});
  }, []);

  function toggleRemove(itemId: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function addService(svc: any) {
    const existing = addItems.find((i) => i.serviceId === svc.id);
    if (existing) {
      setAddItems((prev) => prev.map((i) => i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setAddItems((prev) => [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: parseFloat(svc.basePrice) }]);
    }
  }

  function removeAddItem(serviceId: string) {
    setAddItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }

  function addExtraCharge() {
    const price = parseFloat(extraPrice);
    if (!extraName.trim() || isNaN(price) || price <= 0) return;
    setExtraCharges((prev) => [...prev, { name: extraName.trim(), price }]);
    setExtraName("");
    setExtraPrice("");
  }

  function removeExtraCharge(i: number) {
    setExtraCharges((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await api.orders.edit(order.id, {
        removeItemIds: Array.from(removedIds),
        addItems: addItems.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
        extraCharges,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = removedIds.size > 0 || addItems.length > 0 || extraCharges.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Edit Order — {order.orderNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(["items", "extra"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab ? "border-b-2 border-brand-600 text-brand-700" : "text-gray-500"
              }`}
            >
              {tab === "items" ? "Order Items" : "Extra Charges"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

          {activeTab === "items" && (
            <div className="space-y-4">
              {/* Current items */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Current Items</p>
                <div className="space-y-1">
                  {order.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
                        removedIds.has(item.id) ? "bg-red-50 ring-1 ring-red-200" : "bg-gray-50 ring-1 ring-gray-100"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-800">{item.serviceName ?? item.customName}</div>
                        <div className="text-xs text-gray-400">×{item.quantity} @ ₱{parseFloat(item.unitPrice).toFixed(2)}</div>
                      </div>
                      <button
                        onClick={() => toggleRemove(item.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          removedIds.has(item.id)
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        {removedIds.has(item.id) ? "Undo" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add service items */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Add Services</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {services.slice(0, 20).map((svc: any) => {
                    const inAdd = addItems.find((i) => i.serviceId === svc.id);
                    return (
                      <button
                        key={svc.id}
                        onClick={() => addService(svc)}
                        className={`rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                          inAdd ? "bg-brand-50 ring-1 ring-brand-300" : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="font-medium text-gray-800 truncate">{svc.name}</div>
                        <div className="text-gray-400">₱{parseFloat(svc.basePrice).toFixed(0)}</div>
                        {inAdd && <div className="text-brand-600 font-semibold">×{inAdd.quantity}</div>}
                      </button>
                    );
                  })}
                </div>

                {addItems.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">To Add</p>
                    {addItems.map((i) => (
                      <div key={i.serviceId} className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
                        <span className="text-sm text-brand-800">{i.name} ×{i.quantity}</span>
                        <button onClick={() => removeAddItem(i.serviceId)} className="text-xs text-brand-400 hover:text-red-500">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "extra" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  value={extraName}
                  onChange={(e) => setExtraName(e.target.value)}
                  placeholder="Charge name (e.g. Rush fee, Extra detergent)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={extraPrice}
                    onChange={(e) => setExtraPrice(e.target.value)}
                    placeholder="Amount ₱"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={addExtraCharge}
                    disabled={!extraName.trim() || !extraPrice || parseFloat(extraPrice) <= 0}
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>

              {extraCharges.length > 0 && (
                <div className="space-y-1">
                  {extraCharges.map((charge, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2.5 ring-1 ring-orange-100">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{charge.name}</div>
                        <div className="text-xs text-gray-500">₱{charge.price.toFixed(2)}</div>
                      </div>
                      <button onClick={() => removeExtraCharge(i)} className="text-gray-300 hover:text-red-500 text-lg">×</button>
                    </div>
                  ))}
                </div>
              )}

              {extraCharges.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">Add a custom charge above</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!hasChanges || saving}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

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

  async function processRefund() {
    if (!order) return;
    setRefundLoading(true);
    try {
      await api.orders.edit(order.id, { refund: true });
      setShowRefundConfirm(false);
      await fetchOrder();
    } catch (err: any) {
      setError(err.message ?? "Failed to process refund");
    } finally {
      setRefundLoading(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    setCancelLoading(true);
    try {
      await api.orders.cancel(order.id);
      setShowCancelConfirm(false);
      await fetchOrder();
    } catch (err: any) {
      setError(err.message ?? "Failed to cancel order");
    } finally {
      setCancelLoading(false);
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
  const canEdit = !NON_EDITABLE.includes(order.status);
  const canRefund = order.paymentStatus === "paid";
  const canCancel = !NON_CANCELLABLE.includes(order.status) &&
    (user?.role === "staff" || user?.role === "branch_admin" || user?.role === "superadmin" || user?.role === "org_admin");

  return (
    <div className="p-6 max-w-2xl mx-auto">
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
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${config.color}`}>{config.label}</span>
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ✏️ Edit Order
            </button>
          )}
        </div>
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

      {/* Order items */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900">Order Items</h2>
        <div className="space-y-2">
          {order.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <div className="font-medium text-gray-800">{item.serviceName ?? item.customName}</div>
                <div className="text-xs text-gray-400">&times;{item.quantity} {item.priceUnit ?? "item"} @ &#8369;{parseFloat(item.unitPrice).toFixed(2)}</div>
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
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              order.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
              order.paymentStatus === "refunded" ? "bg-orange-100 text-orange-800" :
              "bg-orange-100 text-orange-800"
            }`}>
              {order.paymentStatus === "paid" ? "✓ Paid" : order.paymentStatus === "refunded" ? "Refunded" : "Unpaid"}
            </span>
            {canRefund && (
              <button
                onClick={() => setShowRefundConfirm(true)}
                className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
              >
                Refund
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {order.paymentStatus !== "paid" && order.paymentStatus !== "refunded" && (
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

      {canCancel && (
        <div className="mt-3">
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Cancel Order
          </button>
        </div>
      )}

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

      {/* Refund confirm modal */}
      {showRefundConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-gray-900">Process Refund</h2>
            <p className="mb-6 text-sm text-gray-500">
              This will mark the payment as refunded for order <span className="font-mono font-medium">{order.orderNumber}</span>.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={refundLoading}
                onClick={processRefund}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {refundLoading ? "Processing…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel order confirm modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-gray-900">Cancel Order?</h2>
            <p className="mb-6 text-sm text-gray-500">
              This will cancel order <span className="font-mono font-medium">{order.orderNumber}</span>.
              The order will remain in the system with status <span className="font-medium text-red-600">Cancelled</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Order
              </button>
              <button
                disabled={cancelLoading}
                onClick={cancelOrder}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order modal */}
      {showEdit && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEdit(false)}
          onSaved={fetchOrder}
        />
      )}
    </div>
  );
}
