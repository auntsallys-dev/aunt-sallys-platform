import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    delivered: "bg-green-100 text-green-700",
};
// ── Customer Detail Drawer ────────────────────────────────────────────────────
function CustomerDetailDrawer({ customerId, onClose, onUpdated, }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState("");
    // Edit form state
    const [editForm, setEditForm] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        notes: "",
    });
    useEffect(() => {
        loadCustomer();
    }, [customerId]);
    async function loadCustomer() {
        setLoading(true);
        setError("");
        try {
            const res = await api.admin.customers.get(customerId);
            setData(res.data);
            setEditForm({
                firstName: res.data.firstName ?? "",
                lastName: res.data.lastName ?? "",
                phone: res.data.phone ?? "",
                email: res.data.email ?? "",
                notes: res.data.notes ?? "",
            });
        }
        catch (err) {
            setError(err.message ?? "Failed to load customer");
        }
        finally {
            setLoading(false);
        }
    }
    async function handleSave() {
        setSaveLoading(true);
        setSaveError("");
        try {
            await api.admin.customers.update(customerId, {
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                phone: editForm.phone,
                email: editForm.email || null,
                notes: editForm.notes || null,
            });
            await loadCustomer();
            setEditing(false);
            onUpdated();
        }
        catch (err) {
            setSaveError(err.message ?? "Failed to save");
        }
        finally {
            setSaveLoading(false);
        }
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0", children: [data ? (_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-gray-900", children: [data.firstName, " ", data.lastName] }), _jsxs("p", { className: "text-sm text-gray-500", children: [data.phone, data.email ? ` · ${data.email}` : ""] }), data.orderCount !== undefined && (_jsxs("p", { className: "text-xs text-gray-400 mt-0.5", children: [data.orderCount, " order", data.orderCount !== 1 ? "s" : "", " total"] }))] })) : (_jsx("h2", { className: "text-lg font-bold text-gray-900", children: "Customer Detail" })), _jsxs("div", { className: "flex items-center gap-2", children: [!editing && data && (_jsx("button", { onClick: () => setEditing(true), className: "rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors", children: "\u270F\uFE0F Edit" })), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl leading-none", children: "\u00D7" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [loading && _jsx("div", { className: "py-12 text-center text-gray-400", children: "Loading\u2026" }), error && _jsx("div", { className: "py-12 text-center text-red-500", children: error }), data && !loading && (_jsxs(_Fragment, { children: [editing ? (_jsxs("div", { className: "rounded-2xl border border-brand-200 bg-brand-50 p-5 space-y-4", children: [_jsx("h3", { className: "font-semibold text-brand-800 text-sm uppercase tracking-wide", children: "Edit Customer" }), saveError && (_jsx("div", { className: "rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700", children: saveError })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "First Name" }), _jsx("input", { value: editForm.firstName, onChange: (e) => setEditForm((f) => ({ ...f, firstName: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Last Name" }), _jsx("input", { value: editForm.lastName, onChange: (e) => setEditForm((f) => ({ ...f, lastName: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Phone" }), _jsx("input", { value: editForm.phone, onChange: (e) => setEditForm((f) => ({ ...f, phone: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Email" }), _jsx("input", { type: "email", value: editForm.email, onChange: (e) => setEditForm((f) => ({ ...f, email: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Notes" }), _jsx("textarea", { value: editForm.notes, onChange: (e) => setEditForm((f) => ({ ...f, notes: e.target.value })), rows: 2, className: "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none resize-none" })] }), _jsxs("div", { className: "flex gap-3 pt-1", children: [_jsx("button", { onClick: () => { setEditing(false); setSaveError(""); }, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { disabled: saveLoading, onClick: handleSave, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60", children: saveLoading ? "Saving…" : "Save Changes" })] })] })) : (
                                /* Contact Info */
                                _jsxs("div", { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("h3", { className: "mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400", children: "Contact Info" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Full Name" }), _jsxs("div", { className: "font-medium text-gray-900", children: [data.firstName, " ", data.lastName] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Phone" }), _jsx("div", { className: "font-medium text-gray-900", children: data.phone ?? "—" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Email" }), _jsx("div", { className: "font-medium text-gray-900", children: data.email ?? "—" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Joined" }), _jsx("div", { className: "font-medium text-gray-900", children: new Date(data.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) })] }), data.notes && (_jsxs("div", { className: "col-span-2", children: [_jsx("div", { className: "text-xs text-gray-400", children: "Notes" }), _jsx("div", { className: "text-gray-700 whitespace-pre-wrap", children: data.notes })] }))] })] })), (data.gender || data.age || data.maritalStatus || data.housingType || data.livesAlone !== null || data.hasHelper !== null) && (_jsxs("div", { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsx("h3", { className: "mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400", children: "Profile" }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [data.gender && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Gender" }), _jsx("div", { className: "font-medium text-gray-900 capitalize", children: data.gender })] })), data.age && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Age" }), _jsx("div", { className: "font-medium text-gray-900", children: data.age })] })), data.maritalStatus && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Marital Status" }), _jsx("div", { className: "font-medium text-gray-900 capitalize", children: data.maritalStatus.replace(/_/g, " ") })] })), data.housingType && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Housing Type" }), _jsx("div", { className: "font-medium text-gray-900 capitalize", children: data.housingType.replace(/_/g, " ") })] })), data.livesAlone !== null && data.livesAlone !== undefined && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Lives Alone" }), _jsx("div", { className: "font-medium text-gray-900", children: data.livesAlone ? "Yes" : "No" })] })), data.hasHelper !== null && data.hasHelper !== undefined && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Has Helper" }), _jsx("div", { className: "font-medium text-gray-900", children: data.hasHelper ? "Yes" : "No" })] })), data.frequentServices?.length > 0 && (_jsxs("div", { className: "col-span-2", children: [_jsx("div", { className: "text-xs text-gray-400", children: "Frequent Services" }), _jsx("div", { className: "flex flex-wrap gap-1 mt-0.5", children: data.frequentServices.map((s) => (_jsx("span", { className: "rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700", children: s }, s))) })] })), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-400", children: "Email Prefs" }), _jsxs("div", { className: "text-xs mt-0.5 space-y-0.5", children: [_jsxs("div", { className: data.emailOrderUpdates ? "text-green-600" : "text-gray-400", children: [data.emailOrderUpdates ? "✓" : "✗", " Order updates"] }), _jsxs("div", { className: data.emailPromos ? "text-green-600" : "text-gray-400", children: [data.emailPromos ? "✓" : "✗", " Promotions"] })] })] })] })] })), _jsxs("div", { className: "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm", children: [_jsxs("h3", { className: "mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400", children: ["Recent Orders ", data.orderCount > 5 ? `(showing 5 of ${data.orderCount})` : `(${data.orderCount ?? 0})`] }), (!data.recentOrders || data.recentOrders.length === 0) ? (_jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No orders yet." })) : (_jsx("div", { className: "space-y-2", children: data.recentOrders.map((order) => (_jsxs("div", { className: "flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-mono text-xs font-semibold text-gray-700", children: order.orderNumber }), _jsxs("div", { className: "text-xs text-gray-400", children: [new Date(order.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }), " · ", order.orderType?.replace("_", " ")] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-semibold text-sm text-gray-900", children: ["\u20B1", parseFloat(order.total ?? "0").toFixed(2)] }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`, children: order.status })] })] }, order.id))) }))] })] }))] })] }) }));
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const searchTimeout = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    async function fetchCustomers(searchVal = debouncedSearch) {
        setLoading(true);
        setError("");
        try {
            const res = await api.admin.customers.list({ page, pageSize: 20, sort, search: searchVal });
            setCustomers(res.data);
            setMeta(res.meta);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { fetchCustomers(); }, [page, sort, debouncedSearch]);
    function handleSearch(e) {
        const val = e.target.value;
        setSearch(val);
        setPage(1);
        if (searchTimeout.current)
            clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setDebouncedSearch(val);
        }, 400);
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Customers" }), _jsx("p", { className: "text-sm text-gray-500", children: meta ? `${meta.total.toLocaleString()} customers` : "Loading…" })] }), _jsxs("div", { className: "mb-6 flex items-center gap-4", children: [_jsx("input", { type: "text", value: search, onChange: handleSearch, placeholder: "Search by name or phone\u2026", className: "flex-1 max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("div", { className: "flex rounded-xl border border-gray-200 overflow-hidden", children: ["recent", "orders"].map((s) => (_jsx("button", { onClick: () => { setSort(s); setPage(1); }, className: `px-4 py-2 text-sm font-medium transition-colors ${sort === s ? "bg-brand-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`, children: s === "recent" ? "Most Recent" : "Most Orders" }, s))) })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), _jsx("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Customer" }), _jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Phone" }), _jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Email" }), _jsx("th", { className: "px-5 py-3 text-right font-semibold text-gray-600", children: "Orders" }), _jsx("th", { className: "px-5 py-3 text-right font-semibold text-gray-600", children: "Last Order" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [loading && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-12 text-center text-gray-400", children: "Loading\u2026" }) })), !loading && customers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-12 text-center text-gray-400", children: "No customers found." }) })), customers.map((customer) => (_jsxs("tr", { onClick: () => setSelectedCustomer(customer.id), className: "hover:bg-gray-50 cursor-pointer transition-colors", children: [_jsxs("td", { className: "px-5 py-3", children: [_jsxs("div", { className: "font-medium text-gray-900", children: [customer.firstName, " ", customer.lastName] }), _jsx("div", { className: "text-xs text-gray-400", children: new Date(customer.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) })] }), _jsx("td", { className: "px-5 py-3 text-gray-600", children: customer.phone }), _jsx("td", { className: "px-5 py-3 text-gray-500", children: customer.email ?? "—" }), _jsx("td", { className: "px-5 py-3 text-right font-semibold text-gray-900", children: customer.totalOrders }), _jsx("td", { className: "px-5 py-3 text-right text-gray-500", children: customer.lastOrderDate
                                                ? new Date(customer.lastOrderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                                                : "—" })] }, customer.id)))] })] }) }), meta && meta.totalPages > 1 && (_jsxs("div", { className: "mt-4 flex items-center justify-between text-sm", children: [_jsxs("span", { className: "text-gray-500", children: ["Page ", meta.page, " of ", meta.totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { disabled: meta.page <= 1, onClick: () => setPage((p) => p - 1), className: "rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50", children: "\u2190 Prev" }), _jsx("button", { disabled: meta.page >= meta.totalPages, onClick: () => setPage((p) => p + 1), className: "rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50", children: "Next \u2192" })] })] })), selectedCustomer && (_jsx(CustomerDetailDrawer, { customerId: selectedCustomer, onClose: () => setSelectedCustomer(null), onUpdated: () => fetchCustomers() }))] }));
}
//# sourceMappingURL=Customers.js.map