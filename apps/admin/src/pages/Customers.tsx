import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api/v1";
const TOKEN = () => localStorage.getItem("admin_token") ?? "";

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready:      "bg-teal-100 text-teal-700",
  completed:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-700",
  delivered:  "bg-green-100 text-green-700",
};

function CustomerOrderHistory({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/admin/customers/${customerId}/orders`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          {data?.customer ? (
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {data.customer.firstName} {data.customer.lastName}
              </h2>
              <p className="text-sm text-gray-500">{data.customer.phone} · {data.customer.email ?? "—"}</p>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-gray-900">Order History</h2>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="py-12 text-center text-gray-400">Loading…</div>}
          {error && <div className="py-12 text-center text-red-500">{error}</div>}

          {data?.orders?.length === 0 && (
            <div className="py-12 text-center text-gray-400">No orders yet.</div>
          )}

          {data?.orders?.map((order: any) => (
            <div key={order.id} className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold text-gray-900">{order.orderNumber}</span>
                  <span className="ml-3 text-xs text-gray-400">{order.branchName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">₱{parseFloat(order.total).toFixed(2)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                {" · "}
                {order.orderType.replace("_", " ")}
              </div>
              {order.items?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {order.items.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="text-xs text-gray-500">
                      {item.serviceName ?? item.customName} × {item.quantity}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="text-xs text-gray-400">+{order.items.length - 3} more</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "orders">("recent");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  async function fetchCustomers() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: "20", sort, search }).toString();
      const res = await apiFetch(`/admin/customers?${qs}`);
      setCustomers(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchCustomers(); }, [page, sort, search]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
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

      {/* Customer history modal */}
      {selectedCustomer && (
        <CustomerOrderHistory
          customerId={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}
