// Stat card data — replace with API calls to /api/v1/admin/reports/summary
const STATS = [
  { label: "Orders Today", value: "24", delta: "+8 from yesterday", color: "text-brand-600" },
  { label: "Revenue Today", value: "₱12,450", delta: "+15%", color: "text-green-600" },
  { label: "Active Orders", value: "7", delta: "3 ready for pickup", color: "text-orange-600" },
  { label: "Customers", value: "1,204", delta: "+12 this week", color: "text-purple-600" },
];

const RECENT_ORDERS = [
  { id: "1", number: "AS-2026-00024", customer: "Maria Santos", branch: "Mandaue", total: "₱325", status: "processing" },
  { id: "2", number: "AS-2026-00023", customer: "Juan Dela Cruz", branch: "IT Park", total: "₱450", status: "ready" },
  { id: "3", number: "AS-2026-00022", customer: "Ana Reyes", branch: "Consolacion", total: "₱180", status: "completed" },
  { id: "4", number: "AS-2026-00021", customer: "Carlos Tan", branch: "Lapu-Lapu", total: "₱640", status: "pending" },
  { id: "5", number: "AS-2026-00020", customer: "Rosa Garcia", branch: "Mandaue", total: "₱290", status: "delivered" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  ready: "bg-teal-100 text-teal-700",
  delivered: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const BRANCH_PERFORMANCE = [
  { name: "Mandaue", orders: 98, revenue: "₱45,200" },
  { name: "IT Park", orders: 72, revenue: "₱33,800" },
  { name: "Consolacion", orders: 54, revenue: "₱24,100" },
  { name: "Lapu-Lapu", orders: 41, revenue: "₱18,600" },
];

export function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, Sally. Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="mt-1 text-xs text-gray-400">{stat.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_ORDERS.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-mono text-sm font-medium text-gray-900">{o.number}</div>
                  <div className="text-sm text-gray-500">{o.customer} · {o.branch}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{o.total}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Branch performance */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Branch Performance</h2>
            <p className="text-xs text-gray-400">This month</p>
          </div>
          <div className="divide-y divide-gray-50">
            {BRANCH_PERFORMANCE.map((b) => (
              <div key={b.name} className="px-5 py-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900">{b.name}</span>
                  <span className="text-sm font-semibold text-brand-600">{b.revenue}</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">{b.orders} orders</div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-500"
                    style={{ width: `${(b.orders / 98) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
