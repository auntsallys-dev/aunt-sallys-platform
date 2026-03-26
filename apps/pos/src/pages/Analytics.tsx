import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

type Period = "today" | "week" | "month";

interface Summary { totalRevenue: number; totalOrders: number; newCustomers: number; }
interface BranchStat { id: string; name: string; orders: number; revenue: number; }
interface TopService { name: string; revenue: number; count: number; }
interface RecentOrder {
  id: string; orderNumber: string; branchName: string;
  status: string; total: string; orderType: string; createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending:          "bg-yellow-100 text-yellow-700",
  confirmed:        "bg-blue-100 text-blue-700",
  picked_up:        "bg-purple-100 text-purple-700",
  processing:       "bg-indigo-100 text-indigo-700",
  ready:            "bg-teal-100 text-teal-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered:        "bg-green-100 text-green-700",
  completed:        "bg-green-100 text-green-700",
  cancelled:        "bg-red-100 text-red-700",
};

function fmt(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function shortBranchName(name: string) {
  return name.replace(/Aunt Sally's\s*[—–-]\s*/i, "");
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<{
    summary: Summary;
    branchStats: BranchStat[];
    topServices: TopService[];
    recentOrders: RecentOrder[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analytics.overview(period);
      if (res.success) setData(res.data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const maxRevenue = data ? Math.max(...data.branchStats.map((b) => b.revenue), 1) : 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Cross-branch business overview</p>
        </div>
        <div className="flex gap-2">
          {(["today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                period === p
                  ? "bg-brand-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-brand-400"
              }`}
            >
              {p === "today" ? "Today" : p === "week" ? "Last 7 Days" : "This Month"}
            </button>
          ))}
          <button
            onClick={load}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading && (
        <div className="flex h-48 items-center justify-center text-gray-400 text-sm">Loading…</div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{fmt(data.summary.totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Orders</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.summary.totalOrders.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">New Customers</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.summary.newCustomers.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Branch breakdown */}
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Revenue by Branch</h2>
              <div className="space-y-4">
                {data.branchStats.map((b) => (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{shortBranchName(b.name)}</span>
                      <span className="text-gray-900 font-semibold">{fmt(b.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-full bg-gray-100 h-2">
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-16 text-right">{b.orders} orders</span>
                    </div>
                  </div>
                ))}
                {data.branchStats.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No orders yet for this period.</p>
                )}
              </div>
            </div>

            {/* Top services */}
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Top Services</h2>
              <div className="space-y-3">
                {data.topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-gray-300">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.count % 1 === 0 ? s.count : s.count.toFixed(1)}× ordered</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(s.revenue)}</span>
                  </div>
                ))}
                {data.topServices.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No services logged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent orders */}
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Recent Orders (All Branches)</h2>
              <span className="text-xs text-gray-400">Last 20</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order #</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Branch</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{o.orderNumber}</td>
                      <td className="px-5 py-3 text-gray-700">{shortBranchName(o.branchName)}</td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{o.orderType.replace("_", " ")}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(parseFloat(o.total))}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                  {data.recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No orders yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
