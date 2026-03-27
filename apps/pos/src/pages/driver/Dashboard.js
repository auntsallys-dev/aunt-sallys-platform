import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    out_for_delivery: "bg-indigo-100 text-indigo-700",
};
export function DriverDashboardPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tracking, setTracking] = useState(false);
    const [gpsStatus, setGpsStatus] = useState("idle");
    const gpsIntervalRef = useRef(null);
    async function fetchOrders() {
        try {
            const branchId = user?.branchId ?? undefined;
            const res = await api.driver.getOrders(branchId);
            setOrders(res.data);
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
        const branchId = user?.branchId;
        if (!branchId)
            return;
        if (tracking) {
            if (gpsIntervalRef.current)
                clearInterval(gpsIntervalRef.current);
            gpsIntervalRef.current = null;
            setTracking(false);
            setGpsStatus("idle");
        }
        else {
            sendLocation(branchId);
            gpsIntervalRef.current = setInterval(() => sendLocation(branchId), 10_000);
            setTracking(true);
        }
    }
    useEffect(() => {
        return () => {
            if (gpsIntervalRef.current)
                clearInterval(gpsIntervalRef.current);
        };
    }, []);
    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("header", { className: "sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-sm font-bold text-gray-900", children: [user?.firstName, " ", user?.lastName] }), _jsx("div", { className: "text-xs text-gray-400", children: "Driver" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: toggleTracking, className: `rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${tracking
                                            ? "bg-green-100 text-green-700 ring-1 ring-green-300"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`, children: tracking ? "● Tracking On" : "Start Tracking" }), _jsx("button", { onClick: handleLogout, className: "text-xs text-gray-400 hover:text-gray-600", children: "Sign Out" })] })] }), gpsStatus === "error" && (_jsx("div", { className: "mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600", children: "GPS unavailable \u2014 check location permissions" }))] }), _jsxs("div", { className: "px-4 py-5", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h1", { className: "text-lg font-bold text-gray-900", children: "Delivery Orders" }), _jsx("button", { onClick: () => { setLoading(true); fetchOrders(); }, className: "text-xs text-brand-600 hover:text-brand-700", children: "Refresh" })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), loading && (_jsx("div", { className: "py-12 text-center text-gray-400", children: "Loading orders\u2026" })), !loading && orders.length === 0 && (_jsxs("div", { className: "py-12 text-center", children: [_jsx("div", { className: "text-4xl mb-3", children: "\uD83D\uDE97" }), _jsx("p", { className: "text-gray-500", children: "No delivery orders assigned." })] })), _jsx("div", { className: "space-y-3", children: orders.map((order) => (_jsxs("div", { onClick: () => navigate(`/driver/orders/${order.id}`), className: "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 active:bg-gray-50 cursor-pointer transition-colors", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("span", { className: "font-mono text-sm font-semibold text-gray-900", children: order.orderNumber }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`, children: order.status.replace(/_/g, " ") })] }), _jsx("div", { className: "text-sm font-medium text-gray-800", children: order.customerName }), order.customerPhone && (_jsx("a", { href: `tel:${order.customerPhone}`, onClick: (e) => e.stopPropagation(), className: "mt-1 text-xs text-brand-600 hover:underline", children: order.customerPhone })), _jsxs("div", { className: "mt-1 text-xs text-gray-400", children: [order.items?.length ?? 0, " item", order.items?.length !== 1 ? "s" : "", " · ", "\u20B1", parseFloat(order.total).toFixed(2)] })] }, order.id))) })] })] }));
}
//# sourceMappingURL=Dashboard.js.map