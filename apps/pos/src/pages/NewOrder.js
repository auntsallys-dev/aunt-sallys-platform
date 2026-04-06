import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
// ── Tab / category config ─────────────────────────────────────────────────────
const TABS = [
    {
        label: "Laundry service",
        categories: ["wash_dry_fold", "wash_dry_press", "dry_only", "heavy_wash", "comforter"],
    },
    { label: "Dryclean/Toys", categories: ["dry_clean"] },
    { label: "Add ons", categories: ["addon", "logistics"] },
];
const CATEGORY_COLORS = {
    wash_dry_fold: "#00ACC1",
    wash_dry_press: "#1E88E5",
    dry_only: "#FB8C00",
    heavy_wash: "#D81B60",
    comforter: "#43A047",
    dry_clean: "#F57C00",
    addon: "#1976D2",
    logistics: "#1565C0",
};
// ── Customer search modal ─────────────────────────────────────────────────────
function CustomerModal({ onClose, onSelect, }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [newFirst, setNewFirst] = useState("");
    const [newLast, setNewLast] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newStreet, setNewStreet] = useState("");
    const [newBarangay, setNewBarangay] = useState("");
    const [newCity, setNewCity] = useState("");
    const [newPostal, setNewPostal] = useState("");
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    async function handleSearch() {
        if (!query.trim())
            return;
        setSearching(true);
        setNotFound(false);
        setResults([]);
        try {
            const res = await api.customers.search(query.trim());
            if (res.data.length === 0) {
                setNotFound(true);
                setNewPhone(query.trim());
            }
            else {
                setResults(res.data);
            }
        }
        catch {
            setNotFound(true);
        }
        finally {
            setSearching(false);
        }
    }
    async function handleCreate() {
        if (!newFirst.trim())
            return;
        setCreating(true);
        try {
            const addressLine = [newStreet.trim(), newBarangay.trim(), newCity.trim(), newPostal.trim()]
                .filter(Boolean).join(", ");
            const res = await api.customers.create({
                firstName: newFirst.trim(),
                lastName: newLast.trim() || undefined,
                phone: newPhone.trim() || undefined,
                email: newEmail.trim() || undefined,
                address: addressLine || undefined,
            });
            onSelect(res.data);
        }
        catch {
            // ignore
        }
        finally {
            setCreating(false);
        }
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-bold text-gray-900", children: "Add Customer" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "mb-3 flex gap-2", children: [_jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSearch(), placeholder: "Phone or name\u2026", className: "flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("button", { onClick: handleSearch, disabled: searching, className: "rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50", children: searching ? "…" : "Search" })] }), results.length > 0 && (_jsx("div", { className: "mb-3 space-y-1", children: results.map((c) => (_jsxs("button", { onClick: () => onSelect(c), className: "w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50", children: [_jsxs("div", { className: "font-medium text-gray-900", children: [c.firstName, " ", c.lastName] }), c.phone && _jsx("div", { className: "text-xs text-gray-500", children: c.phone })] }, c.id))) })), (notFound || showCreate) && (_jsxs("div", { className: "space-y-2 border-t border-gray-100 pt-3 max-h-80 overflow-y-auto", children: [_jsx("p", { className: "text-xs font-medium text-gray-500", children: "New customer" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("input", { value: newFirst, onChange: (e) => setNewFirst(e.target.value), placeholder: "First name *", className: "rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("input", { value: newLast, onChange: (e) => setNewLast(e.target.value), placeholder: "Last name", className: "rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsx("input", { value: newPhone, onChange: (e) => setNewPhone(e.target.value), placeholder: "Phone (e.g. 09171234567)", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("input", { value: newEmail, onChange: (e) => setNewEmail(e.target.value), placeholder: "Email (optional)", type: "email", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("p", { className: "text-xs font-medium text-gray-400 pt-1", children: "Address" }), _jsx("input", { value: newStreet, onChange: (e) => setNewStreet(e.target.value), placeholder: "Street / Unit / House No.", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("input", { value: newBarangay, onChange: (e) => setNewBarangay(e.target.value), placeholder: "Barangay", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("input", { value: newCity, onChange: (e) => setNewCity(e.target.value), placeholder: "City", className: "rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("input", { value: newPostal, onChange: (e) => setNewPostal(e.target.value), placeholder: "Postal code", inputMode: "numeric", className: "rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsx("p", { className: "text-xs text-gray-400", children: "City locked to Metro Manila for delivery orders." }), _jsx("button", { onClick: handleCreate, disabled: creating || !newFirst.trim(), className: "w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-50", children: creating ? "Creating…" : "Create & Add" })] })), !notFound && results.length === 0 && !showCreate && (_jsx("button", { onClick: () => setShowCreate(true), className: "w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600", children: "+ New customer" }))] }) }));
}
// ── Custom service modal ──────────────────────────────────────────────────────
function CustomServiceModal({ onClose, onAdd, }) {
    const [name, setName] = useState("");
    const [priceStr, setPriceStr] = useState("");
    const price = parseFloat(priceStr) || 0;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", onClick: (e) => e.target === e.currentTarget && onClose(), children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-bold text-gray-900", children: "Custom Service" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-gray-600", children: "Service / Item Name" }), _jsx("input", { autoFocus: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Extra detergent, Rush fee\u2026", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-gray-600", children: "Price (VAT inclusive) \u20B1" }), _jsx("input", { type: "number", inputMode: "decimal", value: priceStr, onChange: (e) => setPriceStr(e.target.value), placeholder: "0.00", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] })] }), _jsx("button", { disabled: !name.trim() || price <= 0, onClick: () => { onAdd(name.trim(), price); onClose(); }, className: "mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40", children: "Add to Order" })] }) }));
}
// ── Main page ─────────────────────────────────────────────────────────────────
export function NewOrderPage() {
    const navigate = useNavigate();
    const { selectedBranchId } = useAuth();
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [items, setItems] = useState([]);
    const [customer, setCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showCustomServiceModal, setShowCustomServiceModal] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [showDiscountInput, setShowDiscountInput] = useState(false);
    const [discountStr, setDiscountStr] = useState("");
    const [discountType, setDiscountType] = useState("peso");
    const [orderType, setOrderType] = useState("walk_in");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdOrder, setCreatedOrder] = useState(null);
    useEffect(() => {
        if (selectedBranchId) {
            api.services
                .list(selectedBranchId)
                .then((res) => setServices(res.data))
                .catch(() => api.services.list().then((res) => setServices(res.data)))
                .finally(() => setLoadingServices(false));
        }
    }, [selectedBranchId]);
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total = Math.max(0, subtotal - discount);
    const tabCategories = TABS[activeTab].categories;
    const filteredServices = services.filter((s) => tabCategories.includes(s.category));
    function addService(service) {
        const unitPrice = parseFloat(service.basePrice);
        setItems((prev) => {
            const existing = prev.find((i) => i.serviceId === service.id);
            if (existing) {
                return prev.map((i) => i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [
                ...prev,
                { serviceId: service.id, name: service.name, quantity: 1, unitPrice, priceUnit: service.priceUnit },
            ];
        });
    }
    function adjustQty(serviceId, delta) {
        setItems((prev) => {
            const updated = prev.map((i) => i.serviceId === serviceId ? { ...i, quantity: i.quantity + delta } : i);
            return updated.filter((i) => i.quantity > 0);
        });
    }
    function addCustomService(name, unitPrice) {
        const id = `custom-${Date.now()}`;
        setItems((prev) => [
            ...prev,
            { serviceId: id, name, quantity: 1, unitPrice, priceUnit: "item" },
        ]);
    }
    function removeItem(serviceId) {
        setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
    }
    async function handleSubmit() {
        if (!selectedBranchId) {
            setError("No branch selected");
            return;
        }
        if (items.length === 0) {
            setError("Add at least one service");
            return;
        }
        setError("");
        setSubmitting(true);
        try {
            const res = await api.orders.create({
                branchId: selectedBranchId,
                orderType,
                paymentMethod,
                customerId: customer?.id,
                items: items.map((i) => ({ serviceId: i.serviceId, quantity: i.quantity })),
                discount: discount > 0 ? discount : undefined,
            });
            setCreatedOrder(res.data);
        }
        catch (err) {
            setError(err.message ?? "Failed to create order");
        }
        finally {
            setSubmitting(false);
        }
    }
    // ── Receipt view ───────────────────────────────────────────────────────────
    if (createdOrder) {
        return (_jsx("div", { className: "flex h-full items-center justify-center bg-gray-50 p-8", children: _jsxs("div", { className: "w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200", children: [_jsxs("div", { className: "mb-6 text-center", children: [_jsx("div", { className: "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600", children: _jsx("span", { className: "text-lg font-bold text-white", children: "AS" }) }), _jsx("h2", { className: "text-lg font-bold text-gray-900", children: "Aunt Sally's Laundry" }), _jsx("p", { className: "text-sm text-gray-500", children: "Order Receipt" })] }), _jsxs("div", { className: "mb-4 rounded-xl bg-green-50 px-4 py-3 text-center ring-1 ring-green-200", children: [_jsx("div", { className: "text-xs font-medium text-green-700", children: "Order Created Successfully" }), _jsx("div", { className: "font-mono text-xl font-bold text-green-800", children: createdOrder.orderNumber })] }), _jsxs("div", { className: "mb-4 space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Date" }), _jsx("span", { children: new Date(createdOrder.createdAt).toLocaleDateString("en-PH") })] }), _jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Time" }), _jsx("span", { children: new Date(createdOrder.createdAt).toLocaleTimeString("en-PH", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }) })] }), _jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Type" }), _jsx("span", { className: "capitalize", children: createdOrder.orderType.replace("_", " ") })] }), _jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Payment" }), _jsx("span", { className: "capitalize", children: createdOrder.paymentMethod })] })] }), _jsx("div", { className: "mb-4 border-t border-dashed border-gray-200 pt-4", children: createdOrder.items?.map((item, i) => (_jsxs("div", { className: "mb-2 flex justify-between text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-800", children: item.serviceName }), _jsxs("div", { className: "text-xs text-gray-400", children: ["\u00D7", item.quantity, " ", item.priceUnit, " @ \u20B1", parseFloat(item.unitPrice).toFixed(2)] })] }), _jsxs("div", { className: "font-medium text-gray-900", children: ["\u20B1", parseFloat(item.totalPrice).toFixed(2)] })] }, i))) }), _jsxs("div", { className: "space-y-1 border-t border-gray-200 pt-4 text-sm", children: [_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Subtotal" }), _jsxs("span", { children: ["\u20B1", parseFloat(createdOrder.subtotal).toFixed(2)] })] }), parseFloat(createdOrder.deliveryFee) > 0 && (_jsxs("div", { className: "flex justify-between text-gray-500", children: [_jsx("span", { children: "Delivery fee" }), _jsxs("span", { children: ["\u20B1", parseFloat(createdOrder.deliveryFee).toFixed(2)] })] })), _jsxs("div", { className: "flex justify-between text-base font-bold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-brand-700", children: ["\u20B1", parseFloat(createdOrder.total).toFixed(2)] })] })] }), _jsx("p", { className: "mt-6 text-center text-xs text-gray-400", children: "Thank you for choosing Aunt Sally's!" }), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsx("button", { onClick: () => {
                                    setCreatedOrder(null);
                                    setItems([]);
                                    setCustomer(null);
                                }, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "New Order" }), _jsx("button", { onClick: () => navigate("/queue"), className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700", children: "View Queue" })] })] }) }));
    }
    // ── Main POS layout ────────────────────────────────────────────────────────
    return (_jsxs("div", { className: "flex h-full overflow-hidden", children: [_jsx("div", { className: "flex w-40 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50", children: TABS.map((tab, i) => (_jsx("button", { onClick: () => setActiveTab(i), className: "w-full border-b border-gray-200 px-3 text-left text-sm transition-colors", style: {
                        minHeight: 80,
                        paddingTop: 16,
                        paddingBottom: 16,
                        fontWeight: activeTab === i ? 700 : 500,
                        color: activeTab === i ? "#0e7490" : "#374151",
                        background: activeTab === i ? "#ffffff" : "transparent",
                        borderLeft: `4px solid ${activeTab === i ? "#00ACC1" : "transparent"}`,
                    }, children: tab.label }, tab.label))) }), _jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5", children: [_jsx("span", { className: "text-sm font-semibold text-gray-700", children: TABS[activeTab].label }), _jsx("button", { onClick: () => setShowCustomerModal(true), className: "rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition-colors", style: {
                                    minHeight: 40,
                                    color: customer ? "#16a34a" : "#374151",
                                    background: customer ? "#f0fdf4" : "#ffffff",
                                    borderColor: customer ? "#86efac" : undefined,
                                }, children: customer ? `${customer.firstName} ${customer.lastName}` : "+ Add Customer" })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: loadingServices ? (_jsx("div", { className: "grid grid-cols-5 gap-2", children: Array.from({ length: 8 }).map((_, i) => (_jsx("div", { className: "h-24 animate-pulse rounded-xl bg-gray-200" }, i))) })) : filteredServices.length === 0 ? (_jsx("div", { className: "flex h-32 items-center justify-center text-sm text-gray-400", children: "No services in this category" })) : (_jsxs("div", { className: "grid grid-cols-5 gap-2", children: [_jsxs("button", { onClick: () => setShowCustomServiceModal(true), className: "relative rounded-xl text-left transition-all", style: {
                                        minHeight: 64,
                                        padding: "8px 8px 8px",
                                        background: "#374151",
                                        border: "3px dashed rgba(255,255,255,0.3)",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                    }, children: [_jsx("div", { className: "mb-0.5 text-[10px] font-semibold leading-tight", style: { color: "rgba(255,255,255,0.9)" }, children: "Custom" }), _jsx("div", { className: "text-xs font-bold", style: { color: "rgba(255,255,255,0.7)" }, children: "+ Add" })] }), filteredServices.map((service) => {
                                    const color = CATEGORY_COLORS[service.category] ?? "#6b7280";
                                    const inCart = items.find((i) => i.serviceId === service.id);
                                    return (_jsxs("button", { onClick: () => addService(service), className: "relative rounded-xl text-left transition-all", style: {
                                            minHeight: 64,
                                            padding: "8px 8px 8px",
                                            background: color,
                                            border: inCart
                                                ? "3px solid rgba(255,255,255,0.85)"
                                                : "3px solid transparent",
                                            boxShadow: inCart
                                                ? `0 0 0 2px ${color}, 0 4px 12px rgba(0,0,0,0.25)`
                                                : "0 2px 6px rgba(0,0,0,0.15)",
                                        }, children: [inCart && (_jsx("span", { className: "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold", style: { background: "rgba(0,0,0,0.35)", color: "#fff" }, children: inCart.quantity })), _jsx("div", { className: "mb-0.5 text-[10px] font-semibold leading-tight", style: { color: "rgba(255,255,255,0.95)", wordBreak: "break-word" }, children: service.name }), _jsxs("div", { className: "text-xs font-bold", style: { color: "#fff" }, children: ["\u20B1", parseFloat(service.basePrice).toFixed(0)] })] }, service.id));
                                })] })) }), _jsxs("div", { className: "flex items-center gap-6 border-t border-gray-200 bg-white px-5 py-3", children: [_jsxs("div", { className: "flex flex-1 gap-8 text-sm", children: [_jsxs("span", { className: "text-gray-500", children: ["Subtotal\u00A0", _jsxs("strong", { className: "text-gray-800", children: ["\u20B1", subtotal.toFixed(2)] })] }), _jsxs("button", { onClick: () => { setDiscountStr(discount > 0 ? discount.toString() : ""); setShowDiscountInput(true); }, className: "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", style: {
                                            background: discount > 0 ? "#dcfce7" : "#f3f4f6",
                                            color: discount > 0 ? "#16a34a" : "#374151",
                                            border: `1px solid ${discount > 0 ? "#86efac" : "#e5e7eb"}`,
                                        }, children: [_jsx("span", { children: "\uD83C\uDFF7" }), discount > 0 ? `−₱${discount.toFixed(2)}` : "Discount"] })] }), _jsx("button", { onClick: () => navigate("/queue"), className: "rounded-xl px-6 font-bold text-white", style: {
                                    minHeight: 44,
                                    background: "#F57C00",
                                    border: "none",
                                    fontSize: 14,
                                }, children: "Orders" })] })] }), _jsxs("div", { className: "flex w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-4 py-3", children: [_jsx("h2", { className: "text-base font-bold text-gray-900", children: "Order" }), customer && (_jsxs("span", { className: "text-xs font-medium text-green-700", children: [customer.firstName, " ", customer.lastName] }))] }), _jsxs("div", { className: "border-b border-gray-100 px-4 py-2", children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-gray-400", children: "Order Type" }), _jsxs("div", { className: "flex rounded-xl overflow-hidden border border-gray-200", children: [_jsx("button", { onClick: () => setOrderType("walk_in"), className: "flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1", style: {
                                            background: orderType === "walk_in" ? "#00ACC1" : "#fff",
                                            color: orderType === "walk_in" ? "#fff" : "#374151",
                                        }, children: "\uD83C\uDFC3 Walk-in" }), _jsx("button", { onClick: () => setOrderType("delivery"), className: "flex-1 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1", style: {
                                            background: orderType === "delivery" ? "#00ACC1" : "#fff",
                                            color: orderType === "delivery" ? "#fff" : "#374151",
                                        }, children: "\uD83D\uDE9A Pickup & Delivery" })] }), orderType === "walk_in" && (_jsx("p", { className: "mt-1 text-xs text-gray-400", children: "Payment at counter. No driver queue." })), orderType === "delivery" && (_jsx("p", { className: "mt-1 text-xs text-gray-400", children: "Driver assigned after confirmation." }))] }), _jsx("div", { className: "flex-1 overflow-y-auto px-3 py-2", children: items.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center pt-10 text-gray-400", children: [_jsx("span", { className: "mb-2 text-3xl", children: "\uD83E\uDDFA" }), _jsx("p", { className: "text-xs", children: "Tap a service to add it" })] })) : (_jsx("div", { className: "space-y-2", children: items.map((item) => (_jsxs("div", { className: "rounded-xl bg-gray-50 px-3 py-2.5 ring-1 ring-gray-100", children: [_jsxs("div", { className: "mb-1.5 flex items-start justify-between gap-2", children: [_jsx("span", { className: "text-xs font-semibold leading-snug text-gray-800", children: item.name }), _jsx("button", { onClick: () => removeItem(item.serviceId), className: "text-gray-300 hover:text-red-500 text-base leading-none flex-shrink-0", style: { minWidth: 20, minHeight: 20 }, children: "\u00D7" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("button", { onClick: () => adjustQty(item.serviceId, -1), className: "flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100", style: { fontSize: 16, lineHeight: 1 }, children: "\u2212" }), _jsx("span", { className: "w-7 text-center text-sm font-bold tabular-nums", children: item.quantity }), _jsx("button", { onClick: () => adjustQty(item.serviceId, 1), className: "flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100", style: { fontSize: 16, lineHeight: 1 }, children: "+" })] }), _jsxs("span", { className: "text-sm font-bold text-gray-900", children: ["\u20B1", (item.quantity * item.unitPrice).toFixed(2)] })] })] }, item.serviceId))) })) }), _jsxs("div", { className: "border-t border-gray-100 p-4 space-y-3", children: [error && (_jsx("div", { className: "rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200", children: error })), _jsxs("div", { className: "flex justify-between text-sm font-bold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { className: "text-brand-700", children: ["\u20B1", total.toFixed(2)] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-medium text-gray-500", children: "Payment" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "cash", children: "Cash" }), _jsx("option", { value: "gcash", children: "GCash" }), _jsx("option", { value: "maya", children: "Maya" }), _jsx("option", { value: "card", children: "Card" }), _jsx("option", { value: "bank_transfer", children: "Bank Transfer" })] })] }), _jsx("button", { disabled: items.length === 0 || submitting, onClick: handleSubmit, className: "w-full rounded-xl py-3.5 font-bold text-white transition-colors disabled:opacity-40", style: {
                                    background: items.length === 0 ? "#d1d5db" : "#00ACC1",
                                    minHeight: 52,
                                    fontSize: 15,
                                    cursor: items.length === 0 ? "not-allowed" : "pointer",
                                }, children: submitting ? "Creating Order…" : "Place Order" })] })] }), showCustomerModal && (_jsx(CustomerModal, { onClose: () => setShowCustomerModal(false), onSelect: (c) => {
                    setCustomer(c);
                    setShowCustomerModal(false);
                } })), showCustomServiceModal && (_jsx(CustomServiceModal, { onClose: () => setShowCustomServiceModal(false), onAdd: addCustomService })), showDiscountInput && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40", onClick: (e) => e.target === e.currentTarget && setShowDiscountInput(false), children: _jsxs("div", { className: "w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-bold text-gray-900", children: "Apply Discount" }), _jsx("button", { onClick: () => setShowDiscountInput(false), className: "text-gray-400 hover:text-gray-600 text-xl", children: "\u00D7" })] }), _jsxs("div", { className: "mb-3 flex rounded-xl border border-gray-200 overflow-hidden", children: [_jsx("button", { onClick: () => setDiscountType("peso"), className: "flex-1 py-2 text-sm font-medium transition-colors", style: { background: discountType === "peso" ? "#0e7490" : "#fff", color: discountType === "peso" ? "#fff" : "#374151" }, children: "\u20B1 Amount" }), _jsx("button", { onClick: () => setDiscountType("percent"), className: "flex-1 py-2 text-sm font-medium transition-colors", style: { background: discountType === "percent" ? "#0e7490" : "#fff", color: discountType === "percent" ? "#fff" : "#374151" }, children: "% Percent" })] }), _jsx("input", { autoFocus: true, type: "number", inputMode: "decimal", value: discountStr, onChange: (e) => setDiscountStr(e.target.value), placeholder: discountType === "peso" ? "e.g. 50" : "e.g. 10", className: "mb-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), discountStr && parseFloat(discountStr) > 0 && (_jsx("p", { className: "mb-3 text-xs text-gray-500", children: discountType === "percent"
                                ? `= ₱${(subtotal * parseFloat(discountStr) / 100).toFixed(2)} off`
                                : `₱${parseFloat(discountStr).toFixed(2)} off` })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => { setDiscount(0); setDiscountStr(""); setShowDiscountInput(false); }, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600", children: "Remove" }), _jsx("button", { disabled: !discountStr || parseFloat(discountStr) <= 0, onClick: () => {
                                        const val = parseFloat(discountStr);
                                        setDiscount(discountType === "percent" ? subtotal * val / 100 : val);
                                        setShowDiscountInput(false);
                                    }, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40", children: "Apply" })] })] }) }))] }));
}
//# sourceMappingURL=NewOrder.js.map