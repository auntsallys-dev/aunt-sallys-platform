import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    out_for_pickup: "bg-cyan-100 text-cyan-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    out_for_delivery: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700",
};
function OrderCard({ order, onClick, actionLabel, onAction, actionBusy, badge, }) {
    return (_jsxs("div", { onClick: onClick, className: "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 cursor-pointer active:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "font-mono text-sm font-semibold text-gray-900", children: order.orderNumber }), badge && (_jsx("span", { className: "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700", children: badge }))] }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`, children: order.status.replace(/_/g, " ") })] }), _jsx("div", { className: "text-sm font-medium text-gray-800", children: order.customerName }), order.customerPhone && (_jsx("a", { href: `tel:${order.customerPhone}`, onClick: (e) => e.stopPropagation(), className: "mt-0.5 text-xs text-brand-600 hover:underline block", children: order.customerPhone })), _jsxs("div", { className: "mt-1 text-xs text-gray-400", children: [order.items?.length ?? 0, " item", order.items?.length !== 1 ? "s" : "", " \u00B7 \u20B1", parseFloat(order.total).toFixed(2)] }), actionLabel && onAction && (_jsx("button", { disabled: actionBusy, onClick: (e) => { e.stopPropagation(); onAction(e); }, className: "mt-3 w-full rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors", children: actionBusy ? "Processing…" : actionLabel }))] }));
}
export function DriverDashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [queues, setQueues] = useState({ available_pickup: [], available_delivery: [], my_orders: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tracking, setTracking] = useState(false);
    const [gpsStatus, setGpsStatus] = useState("idle");
    const [busyIds, setBusyIds] = useState(new Set());
    const gpsIntervalRef = useRef(null);
    async function fetchOrders() {
        try {
            const res = await api.driver.getOrders(user?.branchId ?? undefined);
            // Handle both new shape { available_pickup, available_delivery, my_orders }
            // and old flat array shape for backwards compat
            if (Array.isArray(res.data)) {
                setQueues({ available_pickup: [], available_delivery: [], my_orders: res.data });
            }
            else {
                setQueues(res.data);
            }
        }
        catch (err) {
            setError(err.message ?? "Failed to load orders");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30_000);
        return () => clearInterval(interval);
    }, []);
    function sendLocation(branchId, orderId) {
        if (!navigator.geolocation)
            return;
        navigator.geolocation.getCurrentPosition((pos) => {
            api.driver.postLocation(pos.coords.latitude, pos.coords.longitude, branchId, orderId)
                .catch(() => setGpsStatus("error"));
            setGpsStatus("active");
        }, () => setGpsStatus("error"));
    }
    function toggleTracking() {
        if (!user?.branchId)
            return;
        if (tracking) {
            if (gpsIntervalRef.current)
                clearInterval(gpsIntervalRef.current);
            gpsIntervalRef.current = null;
            setTracking(false);
            setGpsStatus("idle");
        }
        else {
            sendLocation(user.branchId);
            gpsIntervalRef.current = setInterval(() => sendLocation(user.branchId), 10_000);
            setTracking(true);
        }
    }
    useEffect(() => {
        return () => { if (gpsIntervalRef.current)
            clearInterval(gpsIntervalRef.current); };
    }, []);
    async function handleSelfAssign(orderId) {
        setBusyIds((prev) => new Set(prev).add(orderId));
        try {
            await api.driver.selfAssign(orderId);
            await fetchOrders();
        }
        catch (err) {
            setError(err.message ?? "Failed to claim order");
        }
        finally {
            setBusyIds((prev) => { const s = new Set(prev); s.delete(orderId); return s; });
        }
    }
    async function handleMarkPickedUp(orderId) {
        setBusyIds((prev) => new Set(prev).add(orderId + "_pickup"));
        try {
            await api.driver.markPickedUp(orderId);
            await fetchOrders();
        }
        catch (err) {
            setError(err.message ?? "Failed to mark picked up");
        }
        finally {
            setBusyIds((prev) => { const s = new Set(prev); s.delete(orderId + "_pickup"); return s; });
        }
    }
    const totalActive = queues.available_pickup.length + queues.available_delivery.length + queues.my_orders.length;
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("header", { className: "sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-sm font-bold text-gray-900", children: [user?.firstName, " ", user?.lastName] }), _jsx("div", { className: "text-xs text-gray-400", children: user?.role })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: toggleTracking, className: `rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${tracking ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`, children: tracking ? "● Tracking On" : "Start Tracking" }), _jsx("button", { onClick: logout, className: "text-xs text-gray-400 hover:text-gray-600", children: "Sign Out" })] })] }), gpsStatus === "error" && (_jsx("div", { className: "mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600", children: "GPS unavailable \u2014 check location permissions" }))] }), _jsxs("div", { className: "px-4 py-5 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-lg font-bold text-gray-900", children: "Orders" }), _jsx("button", { onClick: () => { setLoading(true); fetchOrders(); }, className: "text-xs text-brand-600 hover:text-brand-700", children: "Refresh" })] }), error && _jsx("div", { className: "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error }), loading && _jsx("div", { className: "py-12 text-center text-gray-400", children: "Loading orders\u2026" }), !loading && totalActive === 0 && (_jsxs("div", { className: "py-12 text-center", children: [_jsx("div", { className: "text-4xl mb-3", children: "\uD83D\uDE97" }), _jsx("p", { className: "text-gray-500", children: "No orders available." })] })), queues.available_pickup.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: "mb-3 text-sm font-bold uppercase tracking-wide text-gray-500", children: ["\uD83D\uDCE6 Available for Pickup (", queues.available_pickup.length, ")"] }), _jsx("div", { className: "space-y-3", children: queues.available_pickup.map((order) => (_jsx(OrderCard, { order: order, onClick: () => navigate(`/driver/orders/${order.id}`), actionLabel: "Claim Pickup", onAction: () => handleSelfAssign(order.id), actionBusy: busyIds.has(order.id) }, order.id))) })] })), queues.available_delivery.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: "mb-3 text-sm font-bold uppercase tracking-wide text-gray-500", children: ["\uD83D\uDE9A Ready for Delivery (", queues.available_delivery.length, ")"] }), _jsx("div", { className: "space-y-3", children: queues.available_delivery.map((order) => (_jsx(OrderCard, { order: order, onClick: () => navigate(`/driver/orders/${order.id}`), actionLabel: "Claim Delivery", onAction: () => handleSelfAssign(order.id), actionBusy: busyIds.has(order.id), badge: order.didPickup ? "⭐ You handled the pickup" : undefined }, order.id))) })] })), queues.my_orders.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: "mb-3 text-sm font-bold uppercase tracking-wide text-gray-500", children: ["\uD83D\uDDC2 My Active Orders (", queues.my_orders.length, ")"] }), _jsx("div", { className: "space-y-3", children: queues.my_orders.map((order) => {
                                    let actionLabel;
                                    let onAction;
                                    let actionBusy = false;
                                    if (order.status === "out_for_pickup") {
                                        actionLabel = "I've Picked Up";
                                        onAction = () => handleMarkPickedUp(order.id);
                                        actionBusy = busyIds.has(order.id + "_pickup");
                                    }
                                    else if (order.status === "out_for_delivery") {
                                        actionLabel = "Mark Delivered";
                                        onAction = () => navigate(`/driver/orders/${order.id}`);
                                    }
                                    else if (order.status === "ready") {
                                        actionLabel = "Claim Delivery";
                                        onAction = () => handleSelfAssign(order.id);
                                        actionBusy = busyIds.has(order.id);
                                    }
                                    return (_jsx(OrderCard, { order: order, onClick: () => navigate(`/driver/orders/${order.id}`), actionLabel: actionLabel, onAction: onAction ? (e) => { e.stopPropagation(); onAction(); } : undefined, actionBusy: actionBusy }, order.id));
                                }) })] }))] })] }));
}
//# sourceMappingURL=Dashboard.js.map