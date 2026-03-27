import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
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
const NON_EDITABLE = ["completed", "delivered", "cancelled"];
const NON_CANCELLABLE = ["completed", "delivered", "cancelled"];
// ── Edit Order Modal ──────────────────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSaved, }) {
    const [services, setServices] = useState([]);
    const [removedIds, setRemovedIds] = useState(new Set());
    const [addItems, setAddItems] = useState([]);
    const [extraCharges, setExtraCharges] = useState([]);
    const [extraName, setExtraName] = useState("");
    const [extraPrice, setExtraPrice] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("items");
    useEffect(() => {
        api.services.list().then((res) => setServices(res.data)).catch(() => { });
    }, []);
    function toggleRemove(itemId) {
        setRemovedIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId))
                next.delete(itemId);
            else
                next.add(itemId);
            return next;
        });
    }
    function addService(svc) {
        const existing = addItems.find((i) => i.serviceId === svc.id);
        if (existing) {
            setAddItems((prev) => prev.map((i) => i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i));
        }
        else {
            setAddItems((prev) => [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: parseFloat(svc.basePrice) }]);
        }
    }
    function removeAddItem(serviceId) {
        setAddItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
    }
    function addExtraCharge() {
        const price = parseFloat(extraPrice);
        if (!extraName.trim() || isNaN(price) || price <= 0)
            return;
        setExtraCharges((prev) => [...prev, { name: extraName.trim(), price }]);
        setExtraName("");
        setExtraPrice("");
    }
    function removeExtraCharge(i) {
        setExtraCharges((prev) => prev.filter((_, idx) => idx !== i));
    }
    async function handleSave() {
        setSaving(true);
        setError("");
        try {
            await api.orders.edit(order.id, {
                removeItemIds: Array.from(removedIds),
                addItems: addItems.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
                extraCharges,
            });
            onSaved();
            onClose();
        }
        catch (err) {
            setError(err.message ?? "Failed to save changes");
        }
        finally {
            setSaving(false);
        }
    }
    const hasChanges = removedIds.size > 0 || addItems.length > 0 || extraCharges.length > 0;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center", children: _jsxs("div", { className: "w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-5 py-4", children: [_jsxs("h2", { className: "text-base font-bold text-gray-900", children: ["Edit Order \u2014 ", order.orderNumber] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-xl", children: "\u00D7" })] }), _jsx("div", { className: "flex border-b border-gray-100", children: ["items", "extra"].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab), className: `flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === tab ? "border-b-2 border-brand-600 text-brand-700" : "text-gray-500"}`, children: tab === "items" ? "Order Items" : "Extra Charges" }, tab))) }), _jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4", children: [error && _jsx("div", { className: "mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700", children: error }), activeTab === "items" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400", children: "Current Items" }), _jsx("div", { className: "space-y-1", children: order.items?.map((item) => (_jsxs("div", { className: `flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${removedIds.has(item.id) ? "bg-red-50 ring-1 ring-red-200" : "bg-gray-50 ring-1 ring-gray-100"}`, children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-800", children: item.serviceName ?? item.customName }), _jsxs("div", { className: "text-xs text-gray-400", children: ["\u00D7", item.quantity, " @ \u20B1", parseFloat(item.unitPrice).toFixed(2)] })] }), _jsx("button", { onClick: () => toggleRemove(item.id), className: `rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${removedIds.has(item.id)
                                                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                                                            : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"}`, children: removedIds.has(item.id) ? "Undo" : "Remove" })] }, item.id))) })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400", children: "Add Services" }), _jsx("div", { className: "grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto", children: services.slice(0, 20).map((svc) => {
                                                const inAdd = addItems.find((i) => i.serviceId === svc.id);
                                                return (_jsxs("button", { onClick: () => addService(svc), className: `rounded-xl px-3 py-2 text-left text-xs transition-colors ${inAdd ? "bg-brand-50 ring-1 ring-brand-300" : "bg-gray-50 hover:bg-gray-100"}`, children: [_jsx("div", { className: "font-medium text-gray-800 truncate", children: svc.name }), _jsxs("div", { className: "text-gray-400", children: ["\u20B1", parseFloat(svc.basePrice).toFixed(0)] }), inAdd && _jsxs("div", { className: "text-brand-600 font-semibold", children: ["\u00D7", inAdd.quantity] })] }, svc.id));
                                            }) }), addItems.length > 0 && (_jsxs("div", { className: "mt-3 space-y-1", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-brand-600", children: "To Add" }), addItems.map((i) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-200", children: [_jsxs("span", { className: "text-sm text-brand-800", children: [i.name, " \u00D7", i.quantity] }), _jsx("button", { onClick: () => removeAddItem(i.serviceId), className: "text-xs text-brand-400 hover:text-red-500", children: "\u00D7" })] }, i.serviceId)))] }))] })] })), activeTab === "extra" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("input", { value: extraName, onChange: (e) => setExtraName(e.target.value), placeholder: "Charge name (e.g. Rush fee, Extra detergent)", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", inputMode: "decimal", value: extraPrice, onChange: (e) => setExtraPrice(e.target.value), placeholder: "Amount \u20B1", className: "flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("button", { onClick: addExtraCharge, disabled: !extraName.trim() || !extraPrice || parseFloat(extraPrice) <= 0, className: "rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40", children: "Add" })] })] }), extraCharges.length > 0 && (_jsx("div", { className: "space-y-1", children: extraCharges.map((charge, i) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2.5 ring-1 ring-orange-100", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-800", children: charge.name }), _jsxs("div", { className: "text-xs text-gray-500", children: ["\u20B1", charge.price.toFixed(2)] })] }), _jsx("button", { onClick: () => removeExtraCharge(i), className: "text-gray-300 hover:text-red-500 text-lg", children: "\u00D7" })] }, i))) })), extraCharges.length === 0 && (_jsx("p", { className: "text-center text-sm text-gray-400 py-6", children: "Add a custom charge above" }))] }))] }), _jsxs("div", { className: "border-t border-gray-100 px-5 py-4 flex gap-3", children: [_jsx("button", { onClick: onClose, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { disabled: !hasChanges || saving, onClick: handleSave, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40", children: saving ? "Saving…" : "Save Changes" })] })] }) }));
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export function OrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showRefundConfirm, setShowRefundConfirm] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
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
    async function processRefund() {
        if (!order)
            return;
        setRefundLoading(true);
        try {
            await api.orders.edit(order.id, { refund: true });
            setShowRefundConfirm(false);
            await fetchOrder();
        }
        catch (err) {
            setError(err.message ?? "Failed to process refund");
        }
        finally {
            setRefundLoading(false);
        }
    }
    async function cancelOrder() {
        if (!order)
            return;
        setCancelLoading(true);
        try {
            await api.orders.cancel(order.id);
            setShowCancelConfirm(false);
            await fetchOrder();
        }
        catch (err) {
            setError(err.message ?? "Failed to cancel order");
        }
        finally {
            setCancelLoading(false);
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
    const canEdit = !NON_EDITABLE.includes(order.status);
    const canRefund = order.paymentStatus === "paid";
    const canCancel = !NON_CANCELLABLE.includes(order.status) &&
        (user?.role === "staff" || user?.role === "branch_admin" || user?.role === "superadmin" || user?.role === "org_admin");
    return (_jsxs("div", { className: "p-6 max-w-2xl mx-auto", children: [_jsx("button", { onClick: () => navigate(-1), className: "mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700", children: "\u2190 Back" }), error && _jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200", children: error }), _jsxs("div", { className: "mb-6 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-sm text-gray-500", children: order.orderNumber }), _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: order.customerName }), _jsxs("p", { className: "text-sm text-gray-500", children: [new Date(order.createdAt).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), " · ", new Date(order.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })] })] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsx("span", { className: `rounded-full px-3 py-1 text-sm font-semibold ${config.color}`, children: config.label }), canEdit && (_jsx("button", { onClick: () => setShowEdit(true), className: "rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors", children: "\u270F\uFE0F Edit Order" }))] })] }), _jsxs("div", { className: "mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("div", { className: "flex items-center justify-between", children: STATUS_STEPS.map((step, i) => (_jsxs("div", { className: "flex flex-1 items-center", children: [_jsx("div", { className: `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= currentStep ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400"}`, children: i < currentStep ? "✓" : i + 1 }), i < STATUS_STEPS.length - 1 && (_jsx("div", { className: `h-1 flex-1 ${i < currentStep ? "bg-brand-600" : "bg-gray-100"}` }))] }, step))) }), _jsx("div", { className: "mt-2 flex justify-between text-xs text-gray-400", children: STATUS_STEPS.map((step) => (_jsx("div", { className: "text-center capitalize", style: { flex: 1 }, children: step.replace(/_/g, " ") }, step))) })] }), _jsxs("div", { className: "mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("h2", { className: "mb-3 font-semibold text-gray-900", children: "Order Items" }), _jsx("div", { className: "space-y-2", children: order.items?.map((item, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-800", children: item.serviceName ?? item.customName }), _jsxs("div", { className: "text-xs text-gray-400", children: ["\u00D7", item.quantity, " ", item.priceUnit ?? "item", " @ \u20B1", parseFloat(item.unitPrice).toFixed(2)] })] }), _jsxs("div", { className: "font-semibold text-gray-900", children: ["\u20B1", parseFloat(item.totalPrice).toFixed(2)] })] }, i))) }), _jsxs("div", { className: "mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["\u20B1", parseFloat(order.subtotal).toFixed(2)] })] }), parseFloat(order.deliveryFee ?? "0") > 0 && (_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Delivery fee" }), _jsxs("span", { children: ["\u20B1", parseFloat(order.deliveryFee).toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between text-base font-bold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-brand-700", children: ["\u20B1", parseFloat(order.total).toFixed(2)] })] })] })] }), _jsx("div", { className: "mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Payment" }), _jsxs("div", { className: "text-sm text-gray-500 capitalize", children: [order.paymentMethod, " \u00B7 ", order.paymentStatus] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `rounded-full px-2.5 py-1 text-xs font-semibold ${order.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                                        order.paymentStatus === "refunded" ? "bg-orange-100 text-orange-800" :
                                            "bg-orange-100 text-orange-800"}`, children: order.paymentStatus === "paid" ? "✓ Paid" : order.paymentStatus === "refunded" ? "Refunded" : "Unpaid" }), canRefund && (_jsx("button", { onClick: () => setShowRefundConfirm(true), className: "rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors", children: "Refund" }))] })] }) }), _jsxs("div", { className: "flex gap-3", children: [order.paymentStatus !== "paid" && order.paymentStatus !== "refunded" && (_jsx("button", { onClick: () => setShowPayment(true), className: "flex-1 rounded-xl border border-brand-400 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors", children: "Collect Payment" })), config.next && (_jsx("button", { disabled: updating, onClick: advanceStatus, className: "flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors shadow-sm", children: updating ? "Updating…" : config.nextLabel }))] }), canCancel && (_jsx("div", { className: "mt-3", children: _jsx("button", { onClick: () => setShowCancelConfirm(true), className: "w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors", children: "Cancel Order" }) })), showPayment && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsx("h2", { className: "mb-4 text-lg font-bold text-gray-900", children: "Collect Payment" }), _jsxs("div", { className: "mb-4 rounded-xl bg-gray-50 px-4 py-3", children: [_jsx("div", { className: "text-sm text-gray-500", children: "Amount due" }), _jsxs("div", { className: "text-2xl font-bold text-gray-900", children: ["\u20B1", parseFloat(order.total).toFixed(2)] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "mb-1 block text-sm font-medium text-gray-700", children: "Payment Method" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "cash", children: "Cash" }), _jsx("option", { value: "gcash", children: "GCash" }), _jsx("option", { value: "maya", children: "Maya" }), _jsx("option", { value: "card", children: "Card" }), _jsx("option", { value: "bank_transfer", children: "Bank Transfer" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowPayment(false), className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { disabled: paymentLoading, onClick: collectPayment, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60", children: paymentLoading ? "Processing…" : "Confirm Payment" })] })] }) })), showRefundConfirm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsx("h2", { className: "mb-2 text-lg font-bold text-gray-900", children: "Process Refund" }), _jsxs("p", { className: "mb-6 text-sm text-gray-500", children: ["This will mark the payment as refunded for order ", _jsx("span", { className: "font-mono font-medium", children: order.orderNumber }), ". This action cannot be undone."] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowRefundConfirm(false), className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { disabled: refundLoading, onClick: processRefund, className: "flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60", children: refundLoading ? "Processing…" : "Confirm Refund" })] })] }) })), showCancelConfirm && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsx("h2", { className: "mb-2 text-lg font-bold text-gray-900", children: "Cancel Order?" }), _jsxs("p", { className: "mb-6 text-sm text-gray-500", children: ["This will cancel order ", _jsx("span", { className: "font-mono font-medium", children: order.orderNumber }), ". The order will remain in the system with status ", _jsx("span", { className: "font-medium text-red-600", children: "Cancelled" }), "."] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowCancelConfirm(false), className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Keep Order" }), _jsx("button", { disabled: cancelLoading, onClick: cancelOrder, className: "flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60", children: cancelLoading ? "Cancelling…" : "Yes, Cancel" })] })] }) })), showEdit && (_jsx(EditOrderModal, { order: order, onClose: () => setShowEdit(false), onSaved: fetchOrder }))] }));
}
//# sourceMappingURL=OrderDetail.js.map