import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Service {
  id: string;
  name: string;
  basePrice: string;
  priceUnit: string;
  minQuantity: string;
  category: string;
}

interface LineItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceUnit: string;
}

interface CreatedOrder {
  id: string;
  orderNumber: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{ serviceName: string; quantity: string; unitPrice: string; totalPrice: string; priceUnit: string }>;
  createdAt: string;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const { selectedBranchId } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"walk_in" | "pickup" | "delivery">("walk_in");
  const [items, setItems] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  useEffect(() => {
    if (selectedBranchId) {
      api.services.list(selectedBranchId)
        .then((res) => setServices(res.data))
        .catch(() => api.services.list().then((res) => setServices(res.data)))
        .finally(() => setLoadingServices(false));
    }
  }, [selectedBranchId]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;

  function addService(service: Service) {
    const minQty = parseFloat(service.minQuantity) || 1;
    const unitPrice = parseFloat(service.basePrice);
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === service.id);
      if (existing) {
        return prev.map((i) => i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { serviceId: service.id, name: service.name, quantity: minQty, unitPrice, priceUnit: service.priceUnit }];
    });
  }

  function updateQty(serviceId: string, qty: number) {
    const service = services.find((s) => s.id === serviceId);
    const minQty = service ? parseFloat(service.minQuantity) || 1 : 1;
    if (qty < minQty) {
      setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
    } else {
      setItems((prev) => prev.map((i) => i.serviceId === serviceId ? { ...i, quantity: qty } : i));
    }
  }

  async function handleSubmit() {
    if (!selectedBranchId) { setError("No branch selected"); return; }
    if (items.length === 0) { setError("Add at least one service"); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.orders.create({
        branchId: selectedBranchId,
        orderType,
        paymentMethod,
        items: items.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
      });
      setCreatedOrder(res.data);
    } catch (err: any) {
      setError(err.message ?? "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  // Receipt view
  if (createdOrder) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200">
          {/* Receipt header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600">
              <span className="text-lg font-bold text-white">AS</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Aunt Sally's Laundry</h2>
            <p className="text-sm text-gray-500">Order Receipt</p>
          </div>

          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-center ring-1 ring-green-200">
            <div className="text-xs font-medium text-green-700">Order Created Successfully</div>
            <div className="font-mono text-xl font-bold text-green-800">{createdOrder.orderNumber}</div>
          </div>

          <div className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Date</span>
              <span>{new Date(createdOrder.createdAt).toLocaleDateString("en-PH")}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Time</span>
              <span>{new Date(createdOrder.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Type</span>
              <span className="capitalize">{createdOrder.orderType.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Payment</span>
              <span className="capitalize">{createdOrder.paymentMethod}</span>
            </div>
          </div>

          <div className="mb-4 border-t border-dashed border-gray-200 pt-4">
            {createdOrder.items?.map((item, i) => (
              <div key={i} className="mb-2 flex justify-between text-sm">
                <div>
                  <div className="font-medium text-gray-800">{item.serviceName}</div>
                  <div className="text-xs text-gray-400">&times;{item.quantity} {item.priceUnit} @ &#8369;{parseFloat(item.unitPrice).toFixed(2)}</div>
                </div>
                <div className="font-medium text-gray-900">&#8369;{parseFloat(item.totalPrice).toFixed(2)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>&#8369;{parseFloat(createdOrder.subtotal).toFixed(2)}</span>
            </div>
            {parseFloat(createdOrder.deliveryFee) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery fee</span>
                <span>&#8369;{parseFloat(createdOrder.deliveryFee).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span className="text-brand-700">&#8369;{parseFloat(createdOrder.total).toFixed(2)}</span>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">Thank you for choosing Aunt Sally's!</p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setCreatedOrder(null); setItems([]); setCustomerName(""); setCustomerPhone(""); }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              New Order
            </button>
            <button
              onClick={() => navigate("/queue")}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              View Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const CATEGORY_ICONS: Record<string, string> = {
    wash: "🫧",
    dry_clean: "✨",
    iron: "👔",
    special: "⭐",
  };

  return (
    <div className="flex h-full">
      {/* Left: Service selection */}
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">New Order</h1>

        {/* Customer info */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Customer Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Name (optional)</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in customer"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Phone (optional)</label>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09XX XXX XXXX"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>

        {/* Order type */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Order Type</label>
          <div className="flex gap-2">
            {(["walk_in", "pickup", "delivery"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`rounded-xl border px-5 py-2.5 text-sm font-medium capitalize transition-all ${
                  orderType === t
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                }`}
              >
                {t.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Service grid */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Services</label>
          {loadingServices ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {services.map((service) => {
                const inCart = items.find((i) => i.serviceId === service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() => addService(service)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      inCart
                        ? "border-brand-400 bg-brand-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    <div className="mb-1 text-lg">{CATEGORY_ICONS[service.category] ?? "🧺"}</div>
                    <div className="font-semibold text-gray-900 text-sm">{service.name}</div>
                    <div className="text-sm text-brand-600 font-medium">
                      &#8369;{parseFloat(service.basePrice).toFixed(0)}/{service.priceUnit}
                    </div>
                    {inCart && (
                      <div className="mt-1 text-xs font-semibold text-brand-700">&times;{inCart.quantity} in cart</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Order summary */}
      <div className="flex w-80 flex-col border-l border-gray-200 bg-white">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Order Summary</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center pt-12 text-gray-400">
              <div className="text-4xl mb-3">🧺</div>
              <p className="text-sm">No services added yet</p>
              <p className="text-xs">Click a service to add it</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.serviceId} className="rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                  <span className="text-sm font-bold text-gray-900">&#8369;{(item.quantity * item.unitPrice).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.serviceId, item.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-lg leading-none"
                  >–</button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.serviceId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-lg leading-none"
                  >+</button>
                  <span className="ml-1 text-xs text-gray-400">{item.priceUnit}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-gray-100 p-4 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{error}</div>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>&#8369;{subtotal.toFixed(2)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Delivery fee</span>
                <span>&#8369;{deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total</span>
              <span className="text-brand-700">&#8369;{total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Payment Method</label>
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

          <button
            disabled={items.length === 0 || submitting}
            onClick={handleSubmit}
            className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating Order…" : `Create Order · &#8369;${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
