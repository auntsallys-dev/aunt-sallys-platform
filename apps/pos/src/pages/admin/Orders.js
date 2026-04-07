import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    assigned_for_pickup: "bg-indigo-100 text-indigo-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    delivered: "bg-green-100 text-green-700",
    out_for_delivery: "bg-indigo-100 text-indigo-700",
    cancelled: "bg-red-100 text-red-700",
};
const STATUSES = ["all", "pending", "confirmed", "assigned_for_pickup", "processing", "ready", "completed", "cancelled"];
const CAN_ASSIGN_DRIVER = ["confirmed", "processing", "ready", "out_for_delivery"];
function OrderDetailPanel({ order, onClose, onDriverAssigned }) {
    const { user } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState("");
    const [assignSuccess, setAssignSuccess] = useState("");
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);
    // Transfer to branch
    const [branchesList, setBranchesList] = useState([]);
    const [showTransfer, setShowTransfer] = useState(false);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [transferring, setTransferring] = useState(false);
    const [transferError, setTransferError] = useState("");
    const [transferSuccess, setTransferSuccess] = useState("");
    const canAssign = CAN_ASSIGN_DRIVER.includes(order.status);
    const canTransfer = !["completed", "delivered", "cancelled"].includes(order.status);
    function handleShowTransfer() {
        setShowTransfer(true);
        if (branchesList.length === 0) {
            api.adminBranches.list()
                .then((res) => setBranchesList((res.data ?? []).filter((b) => b.id !== order.branchId)))
                .catch(() => { });
        }
    }
    async function handleTransferBranch() {
        if (!selectedBranchId)
            return;
        setTransferring(true);
        setTransferError("");
        setTransferSuccess("");
        try {
            await api.transferBranch(order.id, selectedBranchId);
            const branch = branchesList.find((b) => b.id === selectedBranchId);
            setTransferSuccess(`Transferred to ${branch?.name ?? "new branch"}`);
            setShowTransfer(false);
            setTimeout(() => { onDriverAssigned(order.id); onClose(); }, 800);
        }
        catch (err) {
            setTransferError(err.message ?? "Failed to transfer order");
        }
        finally {
            setTransferring(false);
        }
    }
    function loadDrivers() {
        if (!user?.branchId)
            return;
        setLoadingDrivers(true);
        api.admin.drivers.list(user.branchId)
            .then((res) => setDrivers(res.data ?? []))
            .catch(() => setDrivers([]))
            .finally(() => setLoadingDrivers(false));
    }
    function handleShowDriverDropdown() {
        setShowDriverDropdown(true);
        if (drivers.length === 0)
            loadDrivers();
    }
    async function handleAssignDriver() {
        if (!selectedDriverId)
            return;
        setAssigning(true);
        setAssignError("");
        setAssignSuccess("");
        try {
            await api.assignDriver(order.id, selectedDriverId);
            const driver = drivers.find((d) => d.id === selectedDriverId);
            setAssignSuccess(`Driver assigned: ${driver?.firstName} ${driver?.lastName}`);
            setShowDriverDropdown(false);
            onDriverAssigned(order.id);
        }
        catch (err) {
            setAssignError(err.message ?? "Failed to assign driver");
        }
        finally {
            setAssigning(false);
        }
    }
    const total = Number(order.total ?? 0);
    const subtotal = Number(order.subtotal ?? 0);
    const deliveryFee = Number(order.deliveryFee ?? 0);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-6 py-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "font-mono text-lg font-bold text-gray-900", children: order.orderNumber ?? order.id?.slice(0, 8) }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`, children: order.status?.replace(/_/g, " ") })] }), _jsxs("p", { className: "text-xs text-gray-400 mt-0.5", children: [order.createdAt ? new Date(order.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—", " · ", (order.orderType ?? "").replace(/_/g, " ") || "—"] })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-5", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Customer" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1 text-sm", children: [_jsx("div", { className: "font-medium text-gray-900", children: order.customerName ?? "Walk-in" }), order.customer?.phone && _jsx("div", { className: "text-gray-500", children: order.customer.phone }), order.customer?.email && _jsx("div", { className: "text-gray-500", children: order.customer.email })] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Details" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-1.5 text-sm", children: [order.branch?.name && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Branch" }), _jsx("span", { className: "text-gray-900", children: order.branch.name })] })), order.notes && (_jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { className: "text-gray-400 shrink-0", children: "Notes" }), _jsx("span", { className: "text-gray-900 text-right", children: order.notes })] }))] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Order Items" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2", children: [order.items?.length > 0 ? order.items.map((item, i) => (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsxs("span", { className: "text-gray-700", children: [item.serviceName ?? item.customName ?? "Custom", " \u00D7 ", parseFloat(item.quantity).toLocaleString(), item.notes && _jsxs("span", { className: "text-xs text-gray-400 ml-1", children: ["(", item.notes, ")"] })] }), _jsxs("span", { className: "text-gray-900 font-medium", children: ["\u20B1", parseFloat(item.totalPrice).toLocaleString()] })] }, item.id ?? i))) : _jsx("div", { className: "text-sm text-gray-400", children: "No items" }), _jsxs("div", { className: "border-t border-gray-200 pt-2 mt-2 space-y-1", children: [deliveryFee > 0 && (_jsxs("div", { className: "flex justify-between text-sm text-gray-500", children: [_jsx("span", { children: "Delivery Fee" }), _jsxs("span", { children: ["\u20B1", deliveryFee.toLocaleString()] })] })), _jsxs("div", { className: "flex justify-between text-sm font-bold text-gray-900", children: [_jsx("span", { children: "Total" }), _jsxs("span", { children: ["\u20B1", total.toLocaleString()] })] })] })] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Payment" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-gray-700 capitalize", children: (order.paymentMethod ?? "—").replace(/_/g, " ") }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                                                order.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-gray-100 text-gray-500"}`, children: order.paymentStatus ?? "unpaid" })] })] }), canTransfer && (_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Branch Transfer" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3", children: [transferSuccess && (_jsx("div", { className: "rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700", children: transferSuccess })), transferError && (_jsx("div", { className: "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700", children: transferError })), !showTransfer ? (_jsx("button", { onClick: handleShowTransfer, className: "w-full rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors", children: "\uD83D\uDD00 Transfer to Branch" })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("select", { value: selectedBranchId, onChange: (e) => setSelectedBranchId(e.target.value), className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Select target branch\u2026" }), branchesList.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id)))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowTransfer(false), className: "flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { onClick: handleTransferBranch, disabled: !selectedBranchId || transferring, className: "flex-1 rounded-xl bg-gray-700 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40", children: transferring ? "Transferring…" : "Confirm Transfer" })] })] }))] })] })), canAssign && (_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase", children: "Driver" }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3", children: [assignSuccess && (_jsx("div", { className: "rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700", children: assignSuccess })), assignError && (_jsx("div", { className: "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700", children: assignError })), !showDriverDropdown ? (_jsx("button", { onClick: handleShowDriverDropdown, className: "w-full rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors", children: "\uD83D\uDE97 Assign Driver" })) : (_jsxs("div", { className: "space-y-2", children: [loadingDrivers ? (_jsx("div", { className: "text-sm text-gray-400 py-2", children: "Loading drivers\u2026" })) : drivers.length === 0 ? (_jsx("div", { className: "text-sm text-gray-400 py-2", children: "No drivers available for this branch." })) : (_jsxs("select", { value: selectedDriverId, onChange: (e) => setSelectedDriverId(e.target.value), className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "", children: "Select a driver\u2026" }), drivers.map((d) => (_jsxs("option", { value: d.id, children: [d.firstName, " ", d.lastName, d.phone ? ` · ${d.phone}` : ""] }, d.id)))] })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setShowDriverDropdown(false), className: "flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { onClick: handleAssignDriver, disabled: !selectedDriverId || assigning, className: "flex-1 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40", children: assigning ? "Assigning…" : "Confirm" })] })] }))] })] }))] })] }) }));
}
export function AdminOrdersPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState(null);
    function fetchOrders() {
        const params = {};
        if (statusFilter !== "all")
            params.status = statusFilter;
        setLoading(true);
        api.orders.list(params)
            .then((res) => setOrders(res.data ?? []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }
    useEffect(() => { fetchOrders(); }, [statusFilter]);
    function handleDriverAssigned(orderId) {
        // Refresh list and close panel after short delay
        setTimeout(() => { fetchOrders(); setSelectedOrder(null); }, 800);
    }
    const filtered = orders.filter((o) => {
        if (!search)
            return true;
        const q = search.toLowerCase();
        const num = (o.orderNumber ?? o.id ?? "").toLowerCase();
        const name = (o.customerName ?? `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}`).toLowerCase();
        return num.includes(q) || name.includes(q);
    });
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Orders" }), _jsxs("span", { className: "text-sm text-gray-400", children: [filtered.length, " orders"] })] }), _jsxs("div", { className: "mb-4 flex gap-3", children: [_jsx("input", { type: "text", placeholder: "Search by order # or customer...", value: search, onChange: (e) => setSearch(e.target.value), className: "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: STATUSES.map((s) => (_jsx("option", { value: s, className: "capitalize", children: s === "all" ? "All Statuses" : s }, s))) })] }), _jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-gray-100 bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Order #" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Customer" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Branch" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Items" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Total" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Payment" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Date" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-50", children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-8 text-center text-gray-400", children: "Loading..." }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-4 py-8 text-center text-gray-400", children: "No orders found." }) })) : filtered.map((o) => (_jsxs("tr", { onClick: () => navigate(`/admin/orders/${o.id}`), className: "hover:bg-gray-50 cursor-pointer transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-mono font-medium text-gray-900", children: o.orderNumber ?? o.id?.slice(0, 8) }), _jsx("td", { className: "px-4 py-3 text-gray-700", children: o.customerName ?? `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}` }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: o.branch?.name ?? "—" }), _jsxs("td", { className: "px-4 py-3 text-gray-500", children: [o.items?.length ?? 0, " item", o.items?.length !== 1 ? "s" : ""] }), _jsxs("td", { className: "px-4 py-3 font-medium text-gray-900", children: ["\u20B1", Number(o.total ?? 0).toLocaleString()] }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium capitalize ${o.paymentStatus === "paid" ? "bg-green-100 text-green-700" :
                                                o.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-gray-100 text-gray-500"}`, children: o.paymentStatus ?? "unpaid" }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`, children: (o.status ?? "").replace(/_/g, " ") }) }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—" })] }, o.id))) })] }) }), selectedOrder && (_jsx(OrderDetailPanel, { order: selectedOrder, onClose: () => setSelectedOrder(null), onDriverAssigned: handleDriverAssigned }))] }));
}
//# sourceMappingURL=Orders.js.map