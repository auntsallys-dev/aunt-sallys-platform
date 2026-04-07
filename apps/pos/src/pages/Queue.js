import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
const STATUS_CONFIG = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", next: "confirmed", nextLabel: "Confirm" },
    confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", next: "processing", nextLabel: "Start Processing" },
    assigned_for_pickup: { label: "Assigned for Pickup", color: "bg-indigo-100 text-indigo-800", next: "confirmed", nextLabel: "Confirm Pickup" },
    processing: { label: "Processing", color: "bg-purple-100 text-purple-800", next: "ready", nextLabel: "Mark Ready" },
    ready: { label: "Ready", color: "bg-green-100 text-green-800" }, // next computed per-order based on returnMethod
    out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", next: "completed", nextLabel: "Mark Delivered" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};
const ACTIVE_STATUSES = ["pending", "confirmed", "assigned_for_pickup", "processing", "ready", "out_for_delivery"];
function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return "just now";
    if (mins < 60)
        return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}
export function QueuePage() {
    const navigate = useNavigate();
    const { selectedBranchId } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("active");
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);
    const fetchOrders = useCallback(async () => {
        if (!selectedBranchId)
            return;
        try {
            const today = new Date().toISOString().split("T")[0];
            const res = await api.orders.list({ branchId: selectedBranchId, date: today });
            setOrders(res.data);
            setError("");
        }
        catch (err) {
            setError(err.message ?? "Failed to load orders");
        }
        finally {
            setLoading(false);
        }
    }, [selectedBranchId]);
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, [fetchOrders]);
    async function advanceStatus(id, nextStatus) {
        setUpdatingId(id);
        try {
            await api.orders.updateStatus(id, nextStatus);
            await fetchOrders();
        }
        catch (err) {
            setError(err.message ?? "Failed to update status");
        }
        finally {
            setUpdatingId(null);
        }
    }
    const filtered = filter === "active"
        ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
        : filter === "all"
            ? orders
            : orders.filter((o) => o.status === filter);
    const activeCounts = orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] ?? 0) + 1;
        return acc;
    }, {});
    const activeTotal = ACTIVE_STATUSES.reduce((s, st) => s + (activeCounts[st] ?? 0), 0);
    return (_jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Order Queue" }), _jsxs("p", { className: "text-sm text-gray-500 mt-0.5", children: [orders.length, " orders today \u00B7 ", activeTotal, " active"] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: fetchOrders, className: "rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50", children: "\u21BB Refresh" }), _jsx("button", { onClick: () => navigate("/orders/new"), className: "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm", children: "+ New Order" })] })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200", children: error })), _jsxs("div", { className: "mb-5 flex gap-2 overflow-x-auto pb-1", children: [_jsxs("button", { onClick: () => setFilter("active"), className: `flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === "active" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`, children: ["Active (", activeTotal, ")"] }), ["pending", "confirmed", "processing", "ready"].map((s) => (_jsxs("button", { onClick: () => setFilter(s), className: `flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === s ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`, children: [STATUS_CONFIG[s].label, " ", activeCounts[s] ? `(${activeCounts[s]})` : ""] }, s))), _jsxs("button", { onClick: () => setFilter("completed"), className: `flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === "completed" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`, children: ["Completed ", activeCounts["completed"] ? `(${activeCounts["completed"]})` : ""] }), _jsxs("button", { onClick: () => setFilter("all"), className: `flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`, children: ["All (", orders.length, ")"] })] }), loading ? (_jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-28 animate-pulse rounded-xl bg-gray-100" }, i))) })) : filtered.length === 0 ? (_jsxs("div", { className: "py-16 text-center text-gray-400", children: [_jsx("div", { className: "text-5xl mb-3", children: "\uD83D\uDCCB" }), _jsx("p", { className: "font-medium", children: "No orders" }), _jsx("p", { className: "text-sm", children: "No orders in this category" })] })) : (_jsx("div", { className: "space-y-3", children: filtered.map((order) => {
                    const baseConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                    // For "ready" status, next action depends on returnMethod
                    const config = order.status === "ready"
                        ? order.returnMethod === "self_pickup"
                            ? { ...baseConfig, next: "collected", nextLabel: "Mark as Collected" }
                            : { ...baseConfig, next: "out_for_delivery", nextLabel: "Assign for Delivery" }
                        : baseConfig;
                    const servicesSummary = order.items?.map((i) => `${i.serviceName} ×${i.quantity}`).join(", ") ?? "—";
                    return (_jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "font-mono text-xs font-semibold text-gray-500", children: order.orderNumber }), order.needsClarification && order.status === "pending" && (_jsx("span", { className: "inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-200", title: order.bookedAs ? `Booked as "${order.bookedAs}" but registered as "${order.customerName}". Verify identity before confirming.` : "A customer with this name or number already exists. Verify identity before confirming.", children: order.bookedAs ? `⚠️ Booked as "${order.bookedAs}"` : "⚠️ clarify" }))] }), _jsx("div", { className: "font-bold text-gray-900", children: order.customerName }), order.needsClarification && order.bookedAs && (_jsxs("div", { className: "mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 ring-1 ring-red-200", children: ["\u26A0\uFE0F Booked as ", _jsxs("span", { className: "font-semibold", children: ["\"", order.bookedAs, "\""] }), " \u2014 registered as ", _jsxs("span", { className: "font-semibold", children: ["\"", order.customerName, "\""] })] })), _jsx("div", { className: "mt-0.5 text-sm text-gray-500 line-clamp-1", children: servicesSummary })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "font-bold text-gray-900", children: ["\u20B1", parseFloat(order.total).toFixed(2)] }), _jsx("div", { className: "text-xs text-gray-400", children: timeAgo(order.createdAt) }), _jsx("div", { className: `mt-1 text-xs font-medium ${order.paymentStatus === "paid" ? "text-green-600" : "text-orange-500"}`, children: order.paymentStatus === "paid" ? "✓ Paid" : "Unpaid" })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.color}`, children: config.label }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => navigate(`/orders/${order.id}`), className: "rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors", children: "Details" }), config.next && (_jsx("button", { disabled: updatingId === order.id, onClick: () => advanceStatus(order.id, config.next), className: "rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors", children: updatingId === order.id ? "…" : config.nextLabel }))] })] })] }, order.id));
                }) }))] }));
}
//# sourceMappingURL=Queue.js.map