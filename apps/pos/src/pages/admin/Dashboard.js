import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};
export function AdminDashboardPage() {
    const [data, setData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        Promise.all([
            api.analytics.overview("today").catch(() => null),
            api.orders.list({ status: undefined }).catch(() => ({ data: [] })),
            api.branches.list().catch(() => ({ data: [] })),
        ]).then(([analytics, ordersRes, branchesRes]) => {
            setData(analytics?.data ?? null);
            setOrders((ordersRes?.data ?? []).slice(0, 5));
            setBranches(branchesRes?.data ?? []);
        }).finally(() => setLoading(false));
    }, []);
    const stats = [
        {
            label: "Orders Today",
            value: loading ? "—" : String(data?.ordersToday ?? orders.length),
            delta: "live",
            color: "text-brand-600",
        },
        {
            label: "Revenue Today",
            value: loading ? "—" : `₱${Number(data?.revenueToday ?? 0).toLocaleString()}`,
            delta: "live",
            color: "text-green-600",
        },
        {
            label: "Active Orders",
            value: loading ? "—" : String(orders.filter((o) => !["completed", "delivered", "cancelled"].includes(o.status)).length),
            delta: "in progress",
            color: "text-orange-600",
        },
        {
            label: "Branches",
            value: loading ? "—" : String(branches.length),
            delta: "active",
            color: "text-purple-600",
        },
    ];
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Dashboard" }), _jsx("p", { className: "text-sm text-gray-500", children: "Welcome back. Here's what's happening today." })] }), _jsx("div", { className: "mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4", children: stats.map((stat) => (_jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("div", { className: "text-sm text-gray-500", children: stat.label }), _jsx("div", { className: `mt-1 text-3xl font-bold ${stat.color}`, children: stat.value }), _jsx("div", { className: "mt-1 text-xs text-gray-400", children: stat.delta })] }, stat.label))) }), _jsxs("div", { className: "grid gap-6 lg:grid-cols-3", children: [_jsxs("div", { className: "lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-100 px-5 py-4", children: _jsx("h2", { className: "font-semibold text-gray-900", children: "Recent Orders" }) }), loading ? (_jsx("div", { className: "px-5 py-8 text-center text-sm text-gray-400", children: "Loading..." })) : orders.length === 0 ? (_jsx("div", { className: "px-5 py-8 text-center text-sm text-gray-400", children: "No orders yet." })) : (_jsx("div", { className: "divide-y divide-gray-50", children: orders.map((o) => (_jsxs("div", { className: "flex items-center justify-between px-5 py-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-sm font-medium text-gray-900", children: o.orderNumber ?? o.id?.slice(0, 8) }), _jsxs("div", { className: "text-sm text-gray-500", children: [o.customer?.firstName, " ", o.customer?.lastName, " \u00B7 ", o.branch?.name ?? "—"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "font-medium text-gray-900", children: ["\u20B1", Number(o.totalAmount ?? 0).toLocaleString()] }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`, children: o.status })] })] }, o.id))) }))] }), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm", children: [_jsx("div", { className: "border-b border-gray-100 px-5 py-4", children: _jsx("h2", { className: "font-semibold text-gray-900", children: "Branches" }) }), loading ? (_jsx("div", { className: "px-5 py-8 text-center text-sm text-gray-400", children: "Loading..." })) : (_jsx("div", { className: "divide-y divide-gray-50", children: branches.map((b) => (_jsxs("div", { className: "px-5 py-3", children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: b.name }), _jsx("div", { className: "text-xs text-gray-400", children: b.address ?? "—" })] }, b.id))) }))] })] })] }));
}
//# sourceMappingURL=Dashboard.js.map