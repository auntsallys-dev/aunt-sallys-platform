import { useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready:      "bg-teal-100 text-teal-700",
  completed:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
  delivered:  "bg-green-100 text-green-700",
};

// ── Customer Detail Drawer ────────────────────────────────────────────────────

function CustomerDetailDrawer({
  customerId,
  onClose,
  onUpdated,
}: {
  customerId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  async function loadCustomer() {
    setLoading(true);
    setError("");
    try {
      const res = await api.admin.customers.get(customerId);
      setData(res.data);
      setEditForm({
        firstName: res.data.firstName ?? "",
        lastName: res.data.lastName ?? "",
        phone: res.data.phone ?? "",
        email: res.data.email ?? "",
        notes: res.data.notes ?? "",
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaveLoading(true);
    setSaveError("");
    try {
      await api.admin.customers.update(customerId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email || null,
        notes: editForm.notes || null,
      });
      await loadCustomer();
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      setSaveError(err.message ?? "Failed to save");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
          {data ? (
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {data.firstName} {data.lastName}
              </h2>
              <p className="text-sm text-gray-500">{data.phone}{data.email ? ` · ${data.email}` : ""}</p>
              {data.orderCount !== undefined && (
                <p className="text-xs text-gray-400 mt-0.5">{data.orderCount} order{data.orderCount !== 1 ? "s" : ""} total</p>
              )}
            </div>
          ) : (
            <h2 className="text-lg font-bold text-gray-900">Customer Detail</h2>
          )}
          <div className="flex items-center gap-2">
            {!editing && data && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                ✏️ Edit
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <div className="py-12 text-center text-gray-400">Loading…</div>}
          {error && <div className="py-12 text-center text-red-500">{error}</div>}

          {data && !loading && (
            <>
              {/* Edit Form */}
              {editing ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 space-y-4">
                  <h3 className="font-semibold text-brand-800 text-sm uppercase tracking-wide">Edit Customer</h3>
                  {saveError && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                      <input
                        value={editForm.firstName}
                        onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                      <input
                        value={editForm.lastName}
                        onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setEditing(false); setSaveError(""); }}
                      className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={saveLoading}
                      onClick={handleSave}
                      className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {saveLoading ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Contact Info */
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Contact Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-400">Full Name</div>
                      <div className="font-medium text-gray-900">{data.firstName} {data.lastName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Phone</div>
                      <div className="font-medium text-gray-900">{data.phone ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="font-medium text-gray-900">{data.email ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Joined</div>
                      <div className="font-medium text-gray-900">
                        {new Date(data.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                      </div>
                    </div>
                    {data.notes && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400">Notes</div>
                        <div className="text-gray-700 whitespace-pre-wrap">{data.notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Info */}
              {(data.gender || data.age || data.maritalStatus || data.housingType || data.livesAlone !== null || data.hasHelper !== null) && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Profile</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {data.gender && (
                      <div>
                        <div className="text-xs text-gray-400">Gender</div>
                        <div className="font-medium text-gray-900 capitalize">{data.gender}</div>
                      </div>
                    )}
                    {data.age && (
                      <div>
                        <div className="text-xs text-gray-400">Age</div>
                        <div className="font-medium text-gray-900">{data.age}</div>
                      </div>
                    )}
                    {data.maritalStatus && (
                      <div>
                        <div className="text-xs text-gray-400">Marital Status</div>
                        <div className="font-medium text-gray-900 capitalize">{data.maritalStatus.replace(/_/g, " ")}</div>
                      </div>
                    )}
                    {data.housingType && (
                      <div>
                        <div className="text-xs text-gray-400">Housing Type</div>
                        <div className="font-medium text-gray-900 capitalize">{data.housingType.replace(/_/g, " ")}</div>
                      </div>
                    )}
                    {data.livesAlone !== null && data.livesAlone !== undefined && (
                      <div>
                        <div className="text-xs text-gray-400">Lives Alone</div>
                        <div className="font-medium text-gray-900">{data.livesAlone ? "Yes" : "No"}</div>
                      </div>
                    )}
                    {data.hasHelper !== null && data.hasHelper !== undefined && (
                      <div>
                        <div className="text-xs text-gray-400">Has Helper</div>
                        <div className="font-medium text-gray-900">{data.hasHelper ? "Yes" : "No"}</div>
                      </div>
                    )}
                    {data.frequentServices?.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-xs text-gray-400">Frequent Services</div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {data.frequentServices.map((s: string) => (
                            <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-400">Email Prefs</div>
                      <div className="text-xs mt-0.5 space-y-0.5">
                        <div className={data.emailOrderUpdates ? "text-green-600" : "text-gray-400"}>
                          {data.emailOrderUpdates ? "✓" : "✗"} Order updates
                        </div>
                        <div className={data.emailPromos ? "text-green-600" : "text-gray-400"}>
                          {data.emailPromos ? "✓" : "✗"} Promotions
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Orders */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Recent Orders {data.orderCount > 5 ? `(showing 5 of ${data.orderCount})` : `(${data.orderCount ?? 0})`}
                </h3>
                {(!data.recentOrders || data.recentOrders.length === 0) ? (
                  <p className="text-sm text-gray-400 text-center py-4">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.recentOrders.map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                        <div>
                          <div className="font-mono text-xs font-semibold text-gray-700">{order.orderNumber}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            {" · "}
                            {order.orderType?.replace("_", " ")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900">₱{parseFloat(order.total ?? "0").toFixed(2)}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "orders">("recent");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  async function fetchCustomers(searchVal = debouncedSearch) {
    setLoading(true);
    setError("");
    try {
      const res = await api.admin.customers.list({ page, pageSize: 20, sort, search: searchVal });
      setCustomers(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCustomers(); }, [page, sort, debouncedSearch]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 400);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500">
          {meta ? `${meta.total.toLocaleString()} customers` : "Loading…"}
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or phone…"
          className="flex-1 max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {(["recent", "orders"] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSort(s); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                sort === s ? "bg-brand-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              {s === "recent" ? "Most Recent" : "Most Orders"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left font-semibold text-gray-600">Customer</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-600">Phone</th>
              <th className="px-5 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-600">Orders</th>
              <th className="px-5 py-3 text-right font-semibold text-gray-600">Last Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">Loading…</td>
              </tr>
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">No customers found.</td>
              </tr>
            )}
            {customers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => setSelectedCustomer(customer.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(customer.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-600">{customer.phone}</td>
                <td className="px-5 py-3 text-gray-500">{customer.email ?? "—"}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{customer.totalOrders}</td>
                <td className="px-5 py-3 text-right text-gray-500">
                  {customer.lastOrderDate
                    ? new Date(customer.lastOrderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Customer detail drawer */}
      {selectedCustomer && (
        <CustomerDetailDrawer
          customerId={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdated={() => fetchCustomers()}
        />
      )}
    </div>
  );
}
