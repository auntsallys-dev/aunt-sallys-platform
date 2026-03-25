import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
const STATUS_STEPS = ["pending", "confirmed", "processing", "ready", "completed"];
const STATUS_CONFIG = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", next: "confirmed", nextLabel: "Confirm Order" },
    confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", next: "processing", nextLabel: "Start Processing" },
    processing: { label: "Processing", color: "bg-purple-100 text-purple-800", next: "ready", nextLabel: "Mark Ready" },
    ready: { label: "Ready for Pickup", color: "bg-green-100 text-green-800", next: "completed", nextLabel: "Complete Order" },
    out_for_delivery: { label: "Out for Delivery", color: "bg-indigo-100 text-indigo-800", next: "completed", nextLabel: "Mark Delivered" },
    completed: { label: "Completed", color: "bg-gray-100 text-gray-800" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};
export function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentLoading, setPaymentLoading] = useState(false);
    async function fetchOrder() {
        if (!id)
            return;
        try {
            const res = await api.orders.get(id);
            setOrder(res.data);
        }
        catch (err) {
            setError(err.message ?? "Failed to load order");
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchOrder(); }, [id]);
    async function advanceStatus() {
        if (!order)
            return;
        const config = STATUS_CONFIG[order.status];
        if (!config.next)
            return;
        setUpdating(true);
        try {
            await api.orders.updateStatus(order.id, config.next);
            await fetchOrder();
        }
        catch (err) {
            setError(err.message ?? "Failed to update status");
        }
        finally {
            setUpdating(false);
        }
    }
    async function collectPayment() {
        if (!order)
            return;
        setPaymentLoading(true);
        try {
            await api.payments.create({
                orderId: order.id,
                amount: parseFloat(order.total),
                method: paymentMethod,
            });
            setShowPayment(false);
            await fetchOrder();
        }
        catch (err) {
            setError(err.message ?? "Failed to record payment");
        }
        finally {
            setPaymentLoading(false);
        }
    }
    if (loading) {
        return _jsx("div", { className: "flex h-full items-center justify-center", children: _jsx("div", { className: "animate-pulse text-gray-400", children: "Loading order\u2026" }) });
    }
    if (error && !order) {
        return _jsx("div", { className: "p-6 text-red-600", children: error });
    }
    if (!order)
        return null;
    const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
    const currentStep = STATUS_STEPS.indexOf(order.status);
    return (_jsxs("div", { className: "p-6 max-w-2xl mx-auto", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 Back" }), error && _jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200", children: error }), _jsxs("div", { className: "mb-6 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-sm text-gray-500", children: order.orderNumber }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: order.customerName }), _jsxs("p", { className: "text-sm text-gray-500", children: [new Date(order.createdAt).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), " · ", new Date(order.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })] })] }), _jsx("span", { className: `rounded-full px-3 py-1 text-sm font-semibold ${config.color}`, children: config.label })] }), _jsxs("div", { className: "mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("div", { className: "flex items-center justify-between", children: STATUS_STEPS.map((step, i) => (_jsxs("div", { className: "flex flex-1 items-center", children: [_jsx("div", { className: `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= currentStep ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`, children: i < currentStep ? "✓" : i + 1 }), i < STATUS_STEPS.length - 1 && (_jsx("div", { className: `h-1 flex-1 ${i < currentStep ? "bg-brand-600" : "bg-gray-100"}` }))] }, step))) }), _jsx("div", { className: "mt-2 flex justify-between text-xs text-gray-400", children: STATUS_STEPS.map((step) => (_jsx("div", { className: "text-center capitalize", style: { flex: 1 }, children: step.replace(/_/g, " ") }, step))) })] }), _jsxs("div", { className: "mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("h2", { className: "mb-3 font-semibold text-gray-900", children: "Order Items" }), _jsx("div", { className: "space-y-2", children: order.items?.map((item, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-800", children: item.serviceName }), _jsxs("div", { className: "text-xs text-gray-400", children: ["\u00D7", item.quantity, " ", item.priceUnit, " @ \u20B1", parseFloat(item.unitPrice).toFixed(2)] })] }), _jsxs("div", { className: "font-semibold text-gray-900", children: ["\u20B1", parseFloat(item.totalPrice).toFixed(2)] })] }, i))) }), _jsxs("div", { className: "mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["\u20B1", parseFloat(order.subtotal).toFixed(2)] })] }), parseFloat(order.deliveryFee ?? "0") > 0 && (_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Delivery fee" }), _jsxs("span", { children: ["\u20B1", parseFloat(order.deliveryFee).toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between text-base font-bold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-brand-700", children: ["\u20B1", parseFloat(order.total).toFixed(2)] })] })] })] }), _jsx("div", { className: "mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Payment" }), _jsxs("div", { className: "text-sm text-gray-500 capitalize", children: [order.paymentMethod, " \u00B7 ", order.paymentStatus] })] }), _jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`, children: order.paymentStatus === "paid" ? "✓ Paid" : "Unpaid" })] }) }), _jsxs("div", { className: "flex gap-3", children: [order.paymentStatus !== "paid" && (_jsx("button", { onClick: () => setShowPayment(true), className: "flex-1 rounded-xl border border-brand-400 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors", children: "Collect Payment" })), config.next && (_jsx("button", { disabled: updating, onClick: advanceStatus, className: "flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors shadow-sm", children: updating ? "Updating…" : config.nextLabel }))] }), showPayment && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsx("h2", { className: "mb-4 text-lg font-bold text-gray-900", children: "Collect Payment" }), _jsxs("div", { className: "mb-4 rounded-xl bg-gray-50 px-4 py-3", children: [_jsx("div", { className: "text-sm text-gray-500", children: "Amount due" }), _jsxs("div", { className: "text-2xl font-bold text-gray-900", children: ["\u20B1", parseFloat(order.total).toFixed(2)] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-700", children: "Payment Method" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "cash", children: "Cash" }), _jsx("option", { value: "gcash", children: "GCash" }), _jsx("option", { value: "maya", children: "Maya" }), _jsx("option", { value: "card", children: "Card" }), _jsx("option", { value: "bank_transfer", children: "Bank Transfer" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowPayment(false), className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { disabled: paymentLoading, onClick: collectPayment, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60", children: paymentLoading ? "Processing…" : "Confirm Payment" })] })] }) }))] }));
}
//# sourceMappingURL=OrderDetail.js.map