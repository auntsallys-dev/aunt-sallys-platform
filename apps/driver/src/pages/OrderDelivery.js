import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
export function OrderDeliveryPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [delivering, setDelivering] = useState(false);
    const [delivered, setDelivered] = useState(false);
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    async function fetchOrder() {
        try {
            const res = await api.driver.getOrders(user?.branchId);
            // data is now { available_pickup, available_delivery, my_orders }
            const allOrders = [
                ...(res.data.available_pickup ?? []),
                ...(res.data.available_delivery ?? []),
                ...(res.data.my_orders ?? []),
            ];
            const found = allOrders.find((o) => o.id === id);
            if (found)
                setOrder(found);
            else
                setError("Order not found");
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchOrder(); }, [id]);
    // Initialize Leaflet map when order has delivery address coords
    useEffect(() => {
        if (!order || !mapRef.current || leafletMap.current)
            return;
        const delivery = order.delivery;
        // Try to get lat/lng from delivery address
        let lat = null;
        let lng = null;
        if (delivery?.lat) {
            lat = parseFloat(delivery.lat);
            lng = parseFloat(delivery.lng);
        }
        // Default to Metro Manila if no coords
        const center = (lat && lng) ? [lat, lng] : [14.5995, 120.9842];
        import("leaflet").then((leafletModule) => {
            const L = leafletModule.default ?? leafletModule;
            L.Icon.Default.prototype._getIconUrl = undefined;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
            if (!mapRef.current)
                return;
            const map = L.map(mapRef.current, { center, zoom: lat ? 16 : 12 });
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '© OpenStreetMap',
            }).addTo(map);
            if (lat && lng) {
                L.marker([lat, lng])
                    .addTo(map)
                    .bindPopup(`<b>${order.customerName}</b>`)
                    .openPopup();
            }
            leafletMap.current = map;
        });
        return () => {
            if (leafletMap.current) {
                leafletMap.current.remove();
                leafletMap.current = null;
            }
        };
    }, [order]);
    async function handleMarkDelivered() {
        if (!id)
            return;
        setDelivering(true);
        try {
            await api.driver.markDelivered(id);
            setDelivered(true);
        }
        catch (err) {
            setError(err.message ?? "Failed to mark as delivered");
        }
        finally {
            setDelivering(false);
        }
    }
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center", children: _jsx("div", { className: "animate-pulse text-gray-400", children: "Loading\u2026" }) }));
    }
    if (error || !order) {
        return (_jsxs("div", { className: "p-4", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 text-sm text-gray-500", children: "\u2190 Back" }), _jsx("div", { className: "text-red-600", children: error || "Order not found" })] }));
    }
    if (delivered) {
        return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center px-4 text-center", children: [_jsx("div", { className: "mb-4 text-6xl", children: "\u2705" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Delivered!" }), _jsxs("p", { className: "mt-2 text-gray-500", children: [order.orderNumber, " marked as delivered."] }), _jsx("button", { onClick: () => navigate("/dashboard"), className: "mt-8 rounded-2xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700", children: "Back to Dashboard" })] }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col bg-gray-50", children: [_jsx("header", { className: "sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3", children: _jsx("button", { onClick: () => navigate(-1), className: "flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 Back" }) }), _jsxs("div", { className: "p-4 space-y-4", children: [error && (_jsx("div", { className: "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), _jsxs("div", { className: "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100", children: [_jsx("div", { className: "mb-1 font-mono text-xs text-gray-400", children: order.orderNumber }), _jsx("h2", { className: "text-xl font-bold text-gray-900", children: order.customerName }), order.customerPhone && (_jsxs("a", { href: `tel:${order.customerPhone}`, className: "mt-1 flex items-center gap-1.5 text-sm text-brand-600", children: ["\uD83D\uDCDE ", order.customerPhone] })), order.delivery?.notes && (_jsx("p", { className: "mt-2 text-sm text-gray-500", children: order.delivery.notes }))] }), _jsxs("div", { className: "rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100", children: [_jsx("div", { ref: mapRef, style: { height: 220, width: "100%" } }), order.delivery && !order.delivery.lat && (_jsx("div", { className: "bg-yellow-50 px-4 py-2 text-xs text-yellow-700", children: "No GPS coordinates for this address." }))] }), _jsxs("div", { className: "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100", children: [_jsx("h3", { className: "mb-3 font-semibold text-gray-900", children: "Order Items" }), _jsx("div", { className: "space-y-2", children: order.items?.map((item, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("div", { className: "text-gray-700", children: item.serviceName ?? item.customName }), _jsxs("div", { className: "text-gray-500", children: ["\u00D7", item.quantity] })] }, i))) }), _jsxs("div", { className: "mt-3 border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["\u20B1", parseFloat(order.total).toFixed(2)] })] })] }), !["delivered", "completed"].includes(order.status) && (_jsx("button", { disabled: delivering, onClick: handleMarkDelivered, className: "w-full rounded-2xl bg-green-600 py-4 text-base font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm", children: delivering ? "Processing…" : "✓ Mark as Delivered" })), ["delivered", "completed"].includes(order.status) && (_jsx("div", { className: "rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700 ring-1 ring-green-200", children: "\u2705 Already delivered" }))] })] }));
}
//# sourceMappingURL=OrderDelivery.js.map