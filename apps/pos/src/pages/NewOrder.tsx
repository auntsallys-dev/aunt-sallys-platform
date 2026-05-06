import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

// ── Tab / category config ─────────────────────────────────────────────────────

const TABS = [
  {
    label: "Laundry service",
    categories: ["wash_dry_fold", "wash_dry_press", "dry_only", "heavy_wash", "comforter"],
  },
  { label: "Dryclean/Toys", categories: ["dry_clean"] },
  { label: "Add ons", categories: ["addon", "logistics"] },
];

const CATEGORY_COLORS: Record<string, string> = {
  wash_dry_fold: "#00ACC1",
  wash_dry_press: "#1E88E5",
  dry_only:       "#FB8C00",
  heavy_wash:     "#D81B60",
  comforter:      "#43A047",
  dry_clean:      "#F57C00",
  addon:          "#1976D2",
  logistics:      "#1565C0",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  basePrice: string;
  priceUnit: string;
  minQuantity: string;
  category: string;
  description?: string;
}

interface LineItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceUnit: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
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

// ── Customer search modal ─────────────────────────────────────────────────────

function CustomerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (c: Customer) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newStreet, setNewStreet] = useState("");
  const [newBarangay, setNewBarangay] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPostal, setNewPostal] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setNotFound(false);
    setResults([]);
    try {
      const res = await api.customers.search(query.trim());
      if (res.data.length === 0) {
        setNotFound(true);
        setNewPhone(query.trim());
      } else {
        setResults(res.data);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    if (!newFirst.trim()) return;
    setCreating(true);
    try {
      const addressLine = [newStreet.trim(), newBarangay.trim(), newCity.trim(), newPostal.trim()]
        .filter(Boolean).join(", ");
      const res = await api.customers.create({
        firstName: newFirst.trim(),
        lastName: newLast.trim() || undefined,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        address: addressLine || undefined,
      });
      onSelect(res.data);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Add Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Search */}
        <div className="mb-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Phone or name…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-3 space-y-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">
                  {c.firstName} {c.lastName}
                </div>
                {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
              </button>
            ))}
          </div>
        )}

        {/* Not found → create */}
        {(notFound || showCreate) && (
          <div className="space-y-2 border-t border-gray-100 pt-3 max-h-80 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500">New customer</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                placeholder="First name *"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
              <input
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                placeholder="Last name"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone (e.g. 09171234567)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (optional)"
              type="email"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <p className="text-xs font-medium text-gray-400 pt-1">Address</p>
            <input
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              placeholder="Street / Unit / House No."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              value={newBarangay}
              onChange={(e) => setNewBarangay(e.target.value)}
              placeholder="Barangay"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="City"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
              <input
                value={newPostal}
                onChange={(e) => setNewPostal(e.target.value)}
                placeholder="Postal code"
                inputMode="numeric"
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-400">City locked to Metro Manila for delivery orders.</p>
            <button
              onClick={handleCreate}
              disabled={creating || !newFirst.trim()}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create & Add"}
            </button>
          </div>
        )}

        {!notFound && results.length === 0 && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600"
          >
            + New customer
          </button>
        )}
      </div>
    </div>
  );
}

// ── Custom service modal ──────────────────────────────────────────────────────

function CustomServiceModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string, price: number) => void;
}) {
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const price = parseFloat(priceStr) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Custom Service</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Service / Item Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Extra detergent, Rush fee…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Price (VAT inclusive) ₱</label>
            <input
              type="number"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          disabled={!name.trim() || price <= 0}
          onClick={() => { onAdd(name.trim(), price); onClose(); }}
          className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Add to Order
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NewOrderPage() {
  const navigate = useNavigate();
  const { selectedBranchId } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountStr, setDiscountStr] = useState("");
  const [discountType, setDiscountType] = useState<"peso" | "percent">("peso");
  const [orderType, setOrderType] = useState<"walk_in" | "delivery">("walk_in");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  // BIR discount picker — applied at invoice issuance time on print.
  // 'sc' / 'pwd' apply 20% off + VAT-exempt (RA 9994 / RA 10754); 'promo' /
  // 'manager' are flat-amount. Lives on the receipt success view.
  type DiscountKind = "none" | "sc" | "pwd" | "promo" | "manager";
  const [discountKind, setDiscountKind] = useState<DiscountKind>("none");
  const [discountIdNumber, setDiscountIdNumber] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  useEffect(() => {
    if (selectedBranchId) {
      api.services
        .list(selectedBranchId)
        .then((res) => setServices(res.data))
        .catch(() => api.services.list().then((res) => setServices(res.data)))
        .finally(() => setLoadingServices(false));
    }
  }, [selectedBranchId]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);

  const tabCategories = TABS[activeTab].categories;
  const filteredServices = services.filter((s) => tabCategories.includes(s.category));

  function addService(service: Service) {
    const unitPrice = parseFloat(service.basePrice);
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === service.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        { serviceId: service.id, name: service.name, quantity: 1, unitPrice, priceUnit: service.priceUnit },
      ];
    });
  }

  function adjustQty(serviceId: string, delta: number) {
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.serviceId === serviceId ? { ...i, quantity: i.quantity + delta } : i
      );
      return updated.filter((i) => i.quantity > 0);
    });
  }

  const CUSTOM_ITEM_ID = "00000000-0000-0000-0000-000000000001";

  function addCustomService(name: string, unitPrice: number) {
    setItems((prev) => [
      ...prev,
      { serviceId: CUSTOM_ITEM_ID, name, quantity: 1, unitPrice, priceUnit: "item" },
    ]);
  }

  function removeItem(serviceId: string) {
    setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }

  async function handleSubmit() {
    if (!selectedBranchId || selectedBranchId === "null") { setError("No branch selected — please log out and log back in"); return; }
    if (items.length === 0) { setError("Add at least one service"); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.orders.create({
        branchId: selectedBranchId,
        orderType,
        paymentMethod,
        customerId: customer?.id,
        items: items.map((i) => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
          ...(i.serviceId === CUSTOM_ITEM_ID ? { unitPrice: i.unitPrice, customName: i.name } : {}),
        })),
        discount: discount > 0 ? discount : undefined,
      });
      setCreatedOrder(res.data);
    } catch (err: any) {
      setError(err.message ?? "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Print receipt — issues BIR Sales Invoice via the server ──────────────
  // The POS no longer renders receipt content client-side; the server
  // computes the per-branch invoice serial, VAT breakdown, and audit trail
  // (apps/api/src/routes/invoices.ts).
  async function printCreatedReceipt() {
    if (!createdOrder) return;
    try {
      // Validate discount inputs before issuing the invoice.
      if ((discountKind === "sc" || discountKind === "pwd") && !discountIdNumber.trim()) {
        alert(`${discountKind.toUpperCase()} discount requires an ID number. Please enter it before printing.`);
        return;
      }
      if (discountKind === "manager" && !discountReason.trim()) {
        alert("Manager-override discount requires a reason. Please enter one before printing.");
        return;
      }
      const flatAmount = discountKind === "promo" || discountKind === "manager"
        ? parseFloat(discountAmount || "0")
        : undefined;
      if ((discountKind === "promo" || discountKind === "manager") && (!flatAmount || flatAmount <= 0)) {
        alert(`${discountKind} discount requires a positive peso amount.`);
        return;
      }

      // Issue (or fetch) the Sales Invoice for this order.
      let invoiceId: string | undefined = (createdOrder as any).invoiceId;
      if (!invoiceId) {
        const res = await api.invoices.issue({
          orderId: createdOrder.id,
          customer: {
            name: customer ? `${customer.firstName} ${customer.lastName}` : "Walk-in Customer",
            address: null,
            tin: null,
            businessStyle: null,
          },
          discount: discountKind !== "none"
            ? {
                type: discountKind,
                idNumber: discountIdNumber.trim() || null,
                amount: flatAmount,
                reason: discountReason.trim() || null,
              }
            : undefined,
        });
        invoiceId = res.data.id as string;
      }

      // Fetch the server-rendered Sales Invoice HTML and open it for print.
      const html = await api.invoices.printHtml(invoiceId!);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      alert(`Could not print receipt: ${err?.message ?? err}`);
    }
  }

  // ── Receipt view ───────────────────────────────────────────────────────────
  if (createdOrder) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200" data-receipt-card>
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
              <span>
                {new Date(createdOrder.createdAt).toLocaleTimeString("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
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
                  <div className="text-xs text-gray-400">
                    &times;{item.quantity} {item.priceUnit} @ &#8369;
                    {parseFloat(item.unitPrice).toFixed(2)}
                  </div>
                </div>
                <div className="font-medium text-gray-900">
                  &#8369;{parseFloat(item.totalPrice).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-gray-200 pt-4 text-sm">
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

          {/* BIR Discount picker — applied at invoice issuance */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-print-hide>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Discount (applied to invoice)</label>
            <select
              value={discountKind}
              onChange={(e) => setDiscountKind(e.target.value as DiscountKind)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-2"
            >
              <option value="none">No discount</option>
              <option value="sc">Senior Citizen — 20% off + VAT exempt</option>
              <option value="pwd">PWD — 20% off + VAT exempt</option>
              <option value="promo">Promo — flat peso amount</option>
              <option value="manager">Manager Override — flat amount + reason</option>
            </select>

            {(discountKind === "sc" || discountKind === "pwd") && (
              <input
                type="text"
                value={discountIdNumber}
                onChange={(e) => setDiscountIdNumber(e.target.value)}
                placeholder={`${discountKind === "sc" ? "Senior Citizen" : "PWD"} ID number (required)`}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-1"
              />
            )}

            {(discountKind === "promo" || discountKind === "manager") && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="Discount amount in PHP (e.g. 50.00)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-1"
              />
            )}

            {discountKind === "manager" && (
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason for override (required, audit-trailed)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-1"
              />
            )}

            {discountKind !== "none" && (
              <p className="text-[11px] text-slate-500 mt-1">
                {discountKind === "sc" || discountKind === "pwd"
                  ? "BIR rule: 20% off the VATable subset, then that subset becomes VAT-exempt. ID number is captured on the invoice and audit trail."
                  : "Discount amount is recorded against the invoice and the audit trail."}
              </p>
            )}
          </div>

          <div className="mt-4" data-print-hide>
            <button
              onClick={() => printCreatedReceipt()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-600 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 active:bg-brand-100 transition-colors"
            >
              🖨️ Print Receipt
            </button>
          </div>

          <div className="mt-3 flex gap-3" data-print-hide>
            <button
              onClick={() => {
                setCreatedOrder(null);
                setItems([]);
                setCustomer(null);
              }}
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

  // ── Main POS layout ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* LEFT SIDEBAR: Category tabs */}
      <div className="flex w-40 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            className="w-full border-b border-gray-200 px-3 text-left text-sm transition-colors"
            style={{
              minHeight: 80,
              paddingTop: 16,
              paddingBottom: 16,
              fontWeight: activeTab === i ? 700 : 500,
              color: activeTab === i ? "#0e7490" : "#374151",
              background: activeTab === i ? "#ffffff" : "transparent",
              borderLeft: `4px solid ${activeTab === i ? "#00ACC1" : "transparent"}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CENTER: Service grid + bottom bar */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
          <span className="text-sm font-semibold text-gray-700">
            {TABS[activeTab].label}
          </span>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              minHeight: 40,
              color: customer ? "#16a34a" : "#374151",
              background: customer ? "#f0fdf4" : "#ffffff",
              borderColor: customer ? "#86efac" : undefined,
            }}
          >
            {customer ? `${customer.firstName} ${customer.lastName}` : "+ Add Customer"}
          </button>
        </div>

        {/* Service tiles */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingServices ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              No services in this category
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {/* Custom service tile */}
              <button
                onClick={() => setShowCustomServiceModal(true)}
                className="relative rounded-xl text-left transition-all"
                style={{
                  minHeight: 64,
                  padding: "8px 8px 8px",
                  background: "#374151",
                  border: "3px dashed rgba(255,255,255,0.3)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <div className="mb-0.5 text-[10px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                  Custom
                </div>
                <div className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                  + Add
                </div>
              </button>

              {filteredServices.map((service) => {
                const color = CATEGORY_COLORS[service.category] ?? "#6b7280";
                const inCart = items.find((i) => i.serviceId === service.id);
                return (
                  <button
                    key={service.id}
                    onClick={() => addService(service)}
                    className="relative rounded-xl text-left transition-all"
                    style={{
                      minHeight: 64,
                      padding: "8px 8px 8px",
                      background: color,
                      border: inCart
                        ? "3px solid rgba(255,255,255,0.85)"
                        : "3px solid transparent",
                      boxShadow: inCart
                        ? `0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.25)`
                        : "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                  >
                    {/* Qty badge */}
                    {inCart && (
                      <span
                        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}
                      >
                        {inCart.quantity}
                      </span>
                    )}
                    <div
                      className="mb-0.5 text-[10px] font-semibold leading-tight"
                      style={{ color: "rgba(255,255,255,0.95)", wordBreak: "break-word" }}
                    >
                      {service.name}
                    </div>
                    <div className="text-xs font-bold" style={{ color: "#fff" }}>
                      &#8369;{parseFloat(service.basePrice).toFixed(0)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center gap-6 border-t border-gray-200 bg-white px-5 py-3">
          <div className="flex flex-1 gap-8 text-sm">
            <span className="text-gray-500">
              Subtotal&nbsp;
              <strong className="text-gray-800">&#8369;{subtotal.toFixed(2)}</strong>
            </span>
            <button
              onClick={() => { setDiscountStr(discount > 0 ? discount.toString() : ""); setShowDiscountInput(true); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: discount > 0 ? "#dcfce7" : "#f3f4f6",
                color: discount > 0 ? "#16a34a" : "#374151",
                border: `1px solid ${discount > 0 ? "#86efac" : "#e5e7eb"}`,
              }}
            >
              <span>🏷</span>
              {discount > 0 ? `−₱${discount.toFixed(2)}` : "Discount"}
            </button>
          </div>
          <button
            onClick={() => navigate("/queue")}
            className="rounded-xl px-6 font-bold text-white"
            style={{
              minHeight: 44,
              background: "#F57C00",
              border: "none",
              fontSize: 14,
            }}
          >
            Orders
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Order summary */}
      <div className="flex w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white">

        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-bold text-gray-900">Order</h2>
          {customer && (
            <span className="text-xs font-medium text-green-700">
              {customer.firstName} {customer.lastName}
            </span>
          )}
        </div>

        {/* Order type toggle */}
        <div className="border-b border-gray-100 px-4 py-2">
          <p className="mb-1.5 text-xs font-medium text-gray-400">Order Type</p>
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              onClick={() => setOrderType("walk_in")}
              className="flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              style={{
                background: orderType === "walk_in" ? "#00ACC1" : "#fff",
                color: orderType === "walk_in" ? "#fff" : "#374151",
              }}
            >
              🏃 Walk-in
            </button>
            <button
              onClick={() => setOrderType("delivery")}
              className="flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              style={{
                background: orderType === "delivery" ? "#00ACC1" : "#fff",
                color: orderType === "delivery" ? "#fff" : "#374151",
              }}
            >
              🚚 Pickup &amp; Delivery
            </button>
          </div>
          {orderType === "walk_in" && (
            <p className="mt-1 text-xs text-gray-400">Payment at counter. No driver queue.</p>
          )}
          {orderType === "delivery" && (
            <p className="mt-1 text-xs text-gray-400">Driver assigned after confirmation.</p>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center pt-10 text-gray-400">
              <span className="mb-2 text-3xl">🧺</span>
              <p className="text-xs">Tap a service to add it</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.serviceId} className="rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold leading-snug text-gray-800">
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeItem(item.serviceId)}
                      className="text-gray-300 hover:text-red-500 text-base leading-none flex-shrink-0"
                      style={{ minWidth: 20, minHeight: 20 }}
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => adjustQty(item.serviceId, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        style={{ fontSize: 16, lineHeight: 1 }}
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => adjustQty(item.serviceId, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        style={{ fontSize: 16, lineHeight: 1 }}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      &#8369;{(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel footer */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-between text-sm font-bold text-gray-900">
            <span>Total</span>
            <span className="text-brand-700">&#8369;{total.toFixed(2)}</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Payment</label>
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
            className="w-full rounded-xl py-3.5 font-bold text-white transition-colors disabled:opacity-40"
            style={{
              background: items.length === 0 ? "#d1d5db" : "#00ACC1",
              minHeight: 52,
              fontSize: 15,
              cursor: items.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creating Order…" : "Place Order"}
          </button>
        </div>
      </div>

      {/* Customer modal */}
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={(c) => {
            setCustomer(c);
            setShowCustomerModal(false);
          }}
        />
      )}
      {showCustomServiceModal && (
        <CustomServiceModal
          onClose={() => setShowCustomServiceModal(false)}
          onAdd={addCustomService}
        />
      )}

      {showDiscountInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowDiscountInput(false)}
        >
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Apply Discount</h2>
              <button onClick={() => setShowDiscountInput(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="mb-3 flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setDiscountType("peso")}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{ background: discountType === "peso" ? "#0e7490" : "#fff", color: discountType === "peso" ? "#fff" : "#374151" }}
              >₱ Amount</button>
              <button
                onClick={() => setDiscountType("percent")}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{ background: discountType === "percent" ? "#0e7490" : "#fff", color: discountType === "percent" ? "#fff" : "#374151" }}
              >% Percent</button>
            </div>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              value={discountStr}
              onChange={(e) => setDiscountStr(e.target.value)}
              placeholder={discountType === "peso" ? "e.g. 50" : "e.g. 10"}
              className="mb-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            {discountStr && parseFloat(discountStr) > 0 && (
              <p className="mb-3 text-xs text-gray-500">
                {discountType === "percent"
                  ? `= ₱${(subtotal * parseFloat(discountStr) / 100).toFixed(2)} off`
                  : `₱${parseFloat(discountStr).toFixed(2)} off`}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setDiscount(0); setDiscountStr(""); setShowDiscountInput(false); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
              >Remove</button>
              <button
                disabled={!discountStr || parseFloat(discountStr) <= 0}
                onClick={() => {
                  const val = parseFloat(discountStr);
                  setDiscount(discountType === "percent" ? subtotal * val / 100 : val);
                  setShowDiscountInput(false);
                }}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
              >Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

