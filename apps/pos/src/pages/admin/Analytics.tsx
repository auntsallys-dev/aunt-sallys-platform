import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { api } from "../../lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCHES = [
  { id: "all", name: "All Branches" },
  { id: "f9437afe-d70e-49df-b33a-f86f11742078", name: "Arton" },
  { id: "601c564b-ce8e-48f0-b7b2-f48e2fefb884", name: "Ayala 30th" },
  { id: "93084732-fcd9-4cd0-95d8-45342fa70743", name: "Tiendesitas" },
  { id: "c8a3216c-a340-4103-898b-e000699beb52", name: "Xavierville" },
];

const DATE_PRESETS = [
  { id: "today",     label: "Today" },
  { id: "last7",     label: "Last 7 Days" },
  { id: "first15",   label: "1st–15th" },
  { id: "last16",    label: "16th–End" },
  { id: "fullMonth", label: "Full Month" },
  { id: "custom",    label: "Custom" },
];

const STATUS_COLOR: Record<string, string> = {
  pending:            "bg-yellow-100 text-yellow-700",
  confirmed:          "bg-blue-100 text-blue-700",
  picked_up:          "bg-purple-100 text-purple-700",
  out_for_pickup:     "bg-purple-100 text-purple-700",
  processing:         "bg-indigo-100 text-indigo-700",
  ready:              "bg-teal-100 text-teal-700",
  out_for_delivery:   "bg-orange-100 text-orange-700",
  assigned_for_pickup:"bg-orange-100 text-orange-700",
  delivered:          "bg-green-100 text-green-700",
  collected:          "bg-green-100 text-green-700",
  completed:          "bg-green-100 text-green-700",
  cancelled:          "bg-red-100 text-red-700",
  transferred:        "bg-gray-100 text-gray-600",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  newCustomers: number;
  completedOrders: number;
  cancelledOrders: number;
}

interface OrderByStatus { status: string; count: number; }
interface OrderByType   { type: string; count: number; }
interface RevenueByDay  { date: string; revenue: number; orders: number; }
interface TopService    { name: string; quantity: number; revenue: number; }
interface AnalyticsOrder {
  orderNumber: string;
  customerName: string;
  branchName: string;
  status: string;
  orderType: string;
  total: string;
  createdAt: string;
  services: string;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  ordersByStatus: OrderByStatus[];
  ordersByType: OrderByType[];
  revenueByDay: RevenueByDay[];
  topServices: TopService[];
  orders: AnalyticsOrder[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year  = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "today": return { from: today, to: today };
    case "last7": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    case "first15":
      return {
        from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        to:   `${year}-${String(month + 1).padStart(2, "0")}-15`,
      };
    case "last16": {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        from: `${year}-${String(month + 1).padStart(2, "0")}-16`,
        to:   `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`,
      };
    }
    case "fullMonth": {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        to:   `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`,
      };
    }
    default: return { from: today, to: today };
  }
}

function fmt(n: number) {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportToExcel(data: AnalyticsData, branchName: string, from: string, to: string) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const summaryData = [
    ["Metric", "Value"],
    ["Total Orders",     data.summary.totalOrders],
    ["Total Revenue",    `₱${data.summary.totalRevenue.toLocaleString()}`],
    ["Avg Order Value",  `₱${data.summary.avgOrderValue.toFixed(2)}`],
    ["New Customers",    data.summary.newCustomers],
    ["Completed Orders", data.summary.completedOrders],
    ["Cancelled Orders", data.summary.cancelledOrders],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

  // Sheet 2: Orders
  const ordersHeaders = ["Order #", "Customer", "Branch", "Status", "Type", "Total", "Date", "Services"];
  const ordersData = [
    ordersHeaders,
    ...data.orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.branchName,
      o.status,
      o.orderType,
      `₱${parseFloat(o.total).toFixed(2)}`,
      new Date(o.createdAt).toLocaleDateString("en-PH"),
      o.services,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersData), "Orders");

  // Sheet 3: Revenue by Day
  const revenueHeaders = ["Date", "Orders", "Revenue"];
  const revenueData = [
    revenueHeaders,
    ...data.revenueByDay.map((r) => [r.date, r.orders, `₱${r.revenue.toLocaleString()}`]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), "Revenue by Day");

  // Sheet 4: Top Services
  const servicesHeaders = ["Service", "Quantity", "Revenue"];
  const servicesData = [
    servicesHeaders,
    ...data.topServices.map((s) => [s.name, s.quantity, `₱${s.revenue.toLocaleString()}`]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(servicesData), "Top Services");

  XLSX.writeFile(wb, `auntsallys-${branchName}-${from}-to-${to}.xlsx`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnalyticsDashboard() {
  const [branchId,      setBranchId]      = useState("all");
  const [datePreset,    setDatePreset]     = useState("fullMonth");
  const [customFrom,    setCustomFrom]     = useState(() => new Date().toISOString().split("T")[0]);
  const [customTo,      setCustomTo]       = useState(() => new Date().toISOString().split("T")[0]);
  const [data,          setData]           = useState<AnalyticsData | null>(null);
  const [loading,       setLoading]        = useState(true);
  const [error,         setError]          = useState<string | null>(null);

  const dateRange = datePreset === "custom"
    ? { from: customFrom, to: customTo }
    : getDateRange(datePreset);

  const branchName = BRANCHES.find((b) => b.id === branchId)?.name ?? "All Branches";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analytics.dashboard({
        branchId: branchId === "all" ? undefined : branchId,
        from: dateRange.from,
        to: dateRange.to,
      });
      if (res.success) setData(res.data as AnalyticsData);
      else setError("API returned error");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [branchId, dateRange.from, dateRange.to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">
            {branchName} · {dateRange.from} to {dateRange.to}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {data && (
            <button
              onClick={() => exportToExcel(data, branchName.replace(/\s+/g, "-"), dateRange.from, dateRange.to)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
        {/* Branch pills */}
        <div className="flex flex-wrap gap-2">
          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchId(b.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                branchId === b.id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        {/* Date preset pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                datePreset === p.id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}

          {datePreset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
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
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard label="Total Orders"     value={data.summary.totalOrders.toLocaleString()} />
            <MetricCard label="Total Revenue"    value={fmt(data.summary.totalRevenue)} />
            <MetricCard label="Avg Order Value"  value={fmt(data.summary.avgOrderValue)} />
            <MetricCard label="New Customers"    value={data.summary.newCustomers.toLocaleString()} />
            <MetricCard label="Completed"        value={data.summary.completedOrders.toLocaleString()} accent="green" />
            <MetricCard label="Cancelled"        value={data.summary.cancelledOrders.toLocaleString()} accent="red" />
          </div>

          {/* Row: Orders by Status / Orders by Type / Top Services */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Orders by Status */}
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Orders by Status</h2>
              <div className="space-y-2">
                {data.ordersByStatus.sort((a, b) => b.count - a.count).map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
                {data.ordersByStatus.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
              </div>
            </div>

            {/* Orders by Type */}
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Orders by Type</h2>
              <div className="space-y-3">
                {data.ordersByType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{t.type.replace(/_/g, " ")}</span>
                    <span className="text-sm font-semibold text-gray-900">{t.count}</span>
                  </div>
                ))}
                {data.ordersByType.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
              </div>
            </div>

            {/* Top Services */}
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Top Services</h2>
              <div className="space-y-2">
                {data.topServices.map((s, i) => (
                  <div key={s.name} className="flex items-start gap-2">
                    <span className="w-5 shrink-0 text-xs font-bold text-gray-300 pt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.quantity}× ordered</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(s.revenue)}</span>
                  </div>
                ))}
                {data.topServices.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
              </div>
            </div>
          </div>

          {/* Revenue by Day */}
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Revenue by Day</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Orders</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.revenueByDay.map((r) => (
                    <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-700">{r.date}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{r.orders}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(r.revenue)}</td>
                    </tr>
                  ))}
                  {data.revenueByDay.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">No revenue data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-xl border border-gray-100 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">All Orders</h2>
              <span className="text-xs text-gray-400">{data.orders.length} orders</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order #</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Branch</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.orders.map((o) => (
                    <tr key={o.orderNumber} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{o.orderNumber}</td>
                      <td className="px-5 py-3 text-gray-700">{o.customerName}</td>
                      <td className="px-5 py-3 text-gray-500">{o.branchName.replace(/Aunt Sally's\s*[—–-]\s*/i, "")}</td>
                      <td className="px-5 py-3 text-gray-500 capitalize">{o.orderType.replace(/_/g, " ")}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(parseFloat(o.total))}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-400">
                        {new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {data.orders.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No orders in this range.</td></tr>
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

// ---------------------------------------------------------------------------
// MetricCard sub-component
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
}) {
  const valueColor =
    accent === "green"
      ? "text-green-700"
      : accent === "red"
      ? "text-red-600"
      : "text-gray-900";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

// Alias for router compatibility
export { AnalyticsDashboard as AdminAnalyticsPage };
