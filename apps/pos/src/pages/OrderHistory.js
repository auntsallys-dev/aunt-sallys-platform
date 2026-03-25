import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    ready: "bg-green-100 text-green-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    out_for_delivery: "bg-indigo-100 text-indigo-800",
};
export function OrderHistoryPage() {
    const navigate = useNavigate();
    const { selectedBranchId } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    useEffect(() => {
        if (!selectedBranchId)
            return;
        setLoading(true);
        api.orders.list({
            branchId: selectedBranchId,
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(dateFilter ? { date: dateFilter } : {}),
        })
            .then((res) => setOrders(res.data))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [selectedBranchId, statusFilter, dateFilter]);
    const filtered = search
        ? orders.filter((o) => o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
            o.customerName?.toLowerCase().includes(search.toLowerCase()))
        : orders;
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Order History" }), _jsxs("p", { className: "text-sm text-gray-500", children: [orders.length, " orders found"] })] }), _jsxs("div", { className: "mb-5 flex flex-wrap gap-3", children: [_jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search order # or customer\u2026", className: "rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none flex-1 min-w-48" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "", children: "All Statuses" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "confirmed", children: "Confirmed" }), _jsx("option", { value: "processing", children: "Processing" }), _jsx("option", { value: "ready", children: "Ready" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] }), _jsx("input", { type: "date", value: dateFilter, onChange: (e) => setDateFilter(e.target.value), className: "rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" }), (search || statusFilter || dateFilter) && (_jsx("button", { onClick: () => { setSearch(""); setStatusFilter(""); setDateFilter(""); }, className: "rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50", children: "Clear" }))] }), loading ? (_jsx("div", { className: "space-y-2", children: [1, 2, 3, 4].map((i) => _jsx("div", { className: "h-16 animate-pulse rounded-xl bg-gray-100" }, i)) })) : filtered.length === 0 ? (_jsxs("div", { className: "py-16 text-center text-gray-400", children: [_jsx("div", { className: "text-4xl mb-3", children: "\uD83D\uDD0D" }), _jsx("p", { children: "No orders found" })] })) : (_jsx("div", { className: "rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-100 bg-gray-50", children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Order #" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Customer" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Date" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Payment" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500", children: "Total" }), _jsx("th", { className: "px-4 py-3" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-100", children: filtered.map((order) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-mono text-xs font-semibold text-gray-600", children: order.orderNumber }), _jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: order.customerName }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`, children: order.status?.replace(/_/g, " ") }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `text-xs font-medium ${order.paymentStatus === "paid" ? "text-green-600" : "text-orange-500"}`, children: order.paymentStatus }) }), _jsxs("td", { className: "px-4 py-3 text-right font-semibold text-gray-900", children: ["\u20B1", parseFloat(order.total ?? "0").toFixed(2)] }), _jsx("td", { className: "px-4 py-3", children: _jsx("button", { onClick: () => navigate(`/orders/${order.id}`), className: "rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100", children: "View" }) })] }, order.id))) })] }) }))] }));
}
//# sourceMappingURL=OrderHistory.js.map