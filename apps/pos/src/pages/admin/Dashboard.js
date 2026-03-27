import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const STATUS_COLORS = {
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
export function AdminDashboardPage() {
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx("p", { className: "text-sm text-gray-500", children: "Welcome back. Here's what's happening today." })] }), _jsx("div", { className: "mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4", children: STATS.map((stat) => (_jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("div", { className: "text-sm text-gray-500", children: stat.label }), _jsx("div", { className: `mt-1 text-3xl font-bold ${stat.color}`, children: stat.value }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: stat.delta })] }, stat.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-100 px-5 py-4", children: _jsx("h2", { className: "font-semibold text-gray-900", children: "Recent Orders" }) }), _jsx("div", { className: "divide-y divide-gray-50", children: RECENT_ORDERS.map((o) => (_jsxs("div", { className: "flex items-center justify-between px-5 py-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-sm font-medium text-gray-900", children: o.number }), _jsxs("div", { className: "text-sm text-gray-500", children: [o.customer, " \u00B7 ", o.branch] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-medium text-gray-900", children: o.total }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`, children: o.status })] })] }, o.id))) })] }), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsxs("div", { className: "border-b border-gray-100 px-5 py-4", children: [_jsx("h2", { className: "font-semibold text-gray-900", children: "Branch Performance" }), _jsx("p", { className: "text-xs text-gray-400", children: "This month" })] }), _jsx("div", { className: "divide-y divide-gray-50", children: BRANCH_PERFORMANCE.map((b) => (_jsxs("div", { className: "px-5 py-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-sm font-medium text-gray-900", children: b.name }), _jsx("span", { className: "text-sm font-semibold text-brand-600", children: b.revenue })] }), _jsxs("div", { className: "mt-1 text-xs text-gray-400", children: [b.orders, " orders"] }), _jsx("div", { className: "mt-1.5 h-1.5 w-full rounded-full bg-gray-100", children: _jsx("div", { className: "h-1.5 rounded-full bg-brand-500", style: { width: `${(b.orders / 98) * 100}%` } }) })] }, b.name))) })] })] })] }));
}
//# sourceMappingURL=Dashboard.js.map