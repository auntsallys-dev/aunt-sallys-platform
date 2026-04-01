import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

type OrderStatus = "pending" | "confirmed" | "assigned_for_pickup" | "processing" | "ready" | "completed" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  assigned_for_pickup: "bg-indigo-100 text-indigo-700",
  processing: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
  delivered: "bg-green-100 text-green-700",
  out_for_delivery: "bg-indigo-100 text-indigo-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUSES: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "assigned_for_pickup", "processing", "ready", "completed", "cancelled"];

const CAN_ASSIGN_DRIVER = ["confirmed", "processing", "ready", "out_for_delivery"];

function OrderDetailPanel({ order, onClose, onDriverAssigned }: {
  order: any;
  onClose: () => void;
  onDriverAssigned: (orderId: string) => void;
}) {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  // Transfer to branch
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  const canAssign = CAN_ASSIGN_DRIVER.includes(order.status);
  const canTransfer = !["completed", "delivered", "cancelled"].includes(order.status);

  function handleShowTransfer() {
    setShowTransfer(true);
    if (branchesList.length === 0) {
      api.adminBranches.list()
        .then((res) => setBranchesList((res.data ?? []).filter((b: any) => b.id !== order.branchId)))
        .catch(() => {});
    }
  }

  async function handleTransferBranch() {
    if (!selectedBranchId) return;
    setTransferring(true);
    setTransferError("");
    setTransferSuccess("");
    try {
      await api.transferBranch(order.id, selectedBranchId);
      const branch = branchesList.find((b: any) => b.id === selectedBranchId);
      setTransferSuccess(`Transferred to ${branch?.name ?? "new branch"}`);
      setShowTransfer(false);
      setTimeout(() => { onDriverAssigned(order.id); onClose(); }, 800);
    } catch (err: any) {
      setTransferError(err.message ?? "Failed to transfer order");
    } finally {
      setTransferring(false);
    }
  }

  function loadDrivers() {
    if (!user?.branchId) return;
    setLoadingDrivers(true);
    api.admin.drivers.list(user.branchId)
      .then((res) => setDrivers(res.data ?? []))
      .catch(() => setDrivers([]))
      .finally(() => setLoadingDrivers(false));
  }

  function handleShowDriverDropdown() {
    setShowDriverDropdown(true);
    if (drivers.length === 0) loadDrivers();
  }

  async function handleAssignDriver() {
    if (!selectedDriverId) return;
    setAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      await api.assignDriver(order.id, selectedDriverId);
      const driver = drivers.find((d) => d.id === selectedDriverId);
      setAssignSuccess(`Driver assigned: ${driver?.firstName} ${driver?.lastName}`);
      setShowDriverDropdown(false);
      onDriverAssigned(order.id);
    } catch (err: any) {
      setAssignError(err.message ?? "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  }

  const total = Number(order.total ?? 0);
  const subtotal = Number(order.subtotal ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-gray-900">{order.orderNumber ?? order.id?.slice(0, 8)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                {order.status?.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {order.createdAt ? new Date(order.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              {" · "}{(order.orderType ?? "").replace(/_/g, " ") || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer */}
          <div>
            <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Customer</div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1 text-sm">
              <div className="font-medium text-gray-900">{order.customerName ?? "Walk-in"}</div>
              {order.customer?.phone && <div className="text-gray-500">{order.customer.phone}</div>}
              {order.customer?.email && <div className="text-gray-500">{order.customer.email}</div>}
            </div>
          </div>

          {/* Branch & Address */}
          <div>
            <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Details</div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5 text-sm">
              {order.branch?.name && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Branch</span>
                  <span className="text-gray-900">{order.branch.name}</span>
                </div>
              )}
              {order.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400 shrink-0">Notes</span>
                  <span className="text-gray-900 text-right">{order.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Order Items</div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
              {order.items?.length > 0 ? order.items.map((item: any, i: number) => (
                <div key={item.id ?? i} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.serviceName ?? item.customName ?? "Custom"} × {parseFloat(item.quantity).toLocaleString()}
                    {item.notes && <span className="text-xs text-gray-400 ml-1">({item.notes})</span>}
                  </span>
                  <span className="text-gray-900 font-medium">₱{parseFloat(item.totalPrice).toLocaleString()}</span>
                </div>
              )) : <div className="text-sm text-gray-400">No items</div>}

              <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery Fee</span><span>₱{deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900">
                  <span>Total</span><span>₱{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Payment</div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between text-sm">
              <span className="text-gray-700 capitalize">{(order.paymentMethod ?? "—").replace(/_/g, " ")}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                order.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                order.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {order.paymentStatus ?? "unpaid"}
              </span>
            </div>
          </div>

          {/* Transfer to Branch */}
          {canTransfer && (
            <div>
              <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Branch Transfer</div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                {transferSuccess && (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{transferSuccess}</div>
                )}
                {transferError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{transferError}</div>
                )}
                {!showTransfer ? (
                  <button
                    onClick={handleShowTransfer}
                    className="w-full rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    🔀 Transfer to Branch
                  </button>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select target branch…</option>
                      {branchesList.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowTransfer(false)}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleTransferBranch}
                        disabled={!selectedBranchId || transferring}
                        className="flex-1 rounded-xl bg-gray-700 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                      >
                        {transferring ? "Transferring…" : "Confirm Transfer"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Driver Assignment */}
          {canAssign && (
            <div>
              <div className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">Driver</div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                {assignSuccess && (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{assignSuccess}</div>
                )}
                {assignError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{assignError}</div>
                )}
                {!showDriverDropdown ? (
                  <button
                    onClick={handleShowDriverDropdown}
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    🚗 Assign Driver
                  </button>
                ) : (
                  <div className="space-y-2">
                    {loadingDrivers ? (
                      <div className="text-sm text-gray-400 py-2">Loading drivers…</div>
                    ) : drivers.length === 0 ? (
                      <div className="text-sm text-gray-400 py-2">No drivers available for this branch.</div>
                    ) : (
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Select a driver…</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>{d.firstName} {d.lastName}{d.phone ? ` · ${d.phone}` : ""}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDriverDropdown(false)}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAssignDriver}
                        disabled={!selectedDriverId || assigning}
                        className="flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
                      >
                        {assigning ? "Assigning…" : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  function fetchOrders() {
    const params: any = {};
    if (statusFilter !== "all") params.status = statusFilter;
    setLoading(true);
    api.orders.list(params)
      .then((res) => setOrders(res.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  function handleDriverAssigned(orderId: string) {
    // Refresh list and close panel after short delay
    setTimeout(() => { fetchOrders(); setSelectedOrder(null); }, 800);
  }

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const num = (o.orderNumber ?? o.id ?? "").toLowerCase();
    const name = (o.customerName ?? `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}`).toLowerCase();
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
              <th className="px-4 py-3 text-left font-medium text-gray-500">Items</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Payment</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No orders found.</td></tr>
            ) : filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelectedOrder(o)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-mono font-medium text-gray-900">{o.orderNumber ?? o.id?.slice(0, 8)}</td>
                <td className="px-4 py-3 text-gray-700">{o.customerName ?? `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}`}</td>
                <td className="px-4 py-3 text-gray-600">{o.branch?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{o.items?.length ?? 0} item{o.items?.length !== 1 ? "s" : ""}</td>
                <td className="px-4 py-3 font-medium text-gray-900">₱{Number(o.total ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    o.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                    o.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {o.paymentStatus ?? "unpaid"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {(o.status ?? "").replace(/_/g, " ")}
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

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDriverAssigned={handleDriverAssigned}
        />
      )}
    </div>
  );
}
