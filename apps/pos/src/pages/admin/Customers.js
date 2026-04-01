import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
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
function CustomerOrderHistory({ customerId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        api.admin.customers.orderHistory(customerId)
            .then((res) => setData(res.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [customerId]);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-6 py-4", children: [data?.customer ? (_jsxs("div", { children: [_jsxs("h2", { className: "text-lg font-bold text-gray-900", children: [data.customer.firstName, " ", data.customer.lastName] }), _jsxs("p", { className: "text-sm text-gray-500", children: [data.customer.phone, " \u00B7 ", data.customer.email ?? "—"] }), data?.orders?.length > 0 && (_jsxs("p", { className: "text-xs text-gray-400 mt-1", children: [data.orders.length, " order", data.orders.length !== 1 ? "s" : "", " \u00B7 Total spend: \u20B1", data.orders.reduce((sum, o) => sum + parseFloat(o.total ?? "0"), 0).toLocaleString()] }))] })) : (_jsx("h2", { className: "text-lg font-bold text-gray-900", children: "Order History" })), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl", children: "\u00D7" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [loading && _jsx("div", { className: "py-12 text-center text-gray-400", children: "Loading\u2026" }), error && _jsx("div", { className: "py-12 text-center text-red-500", children: error }), data?.orders?.length === 0 && (_jsx("div", { className: "py-12 text-center text-gray-400", children: "No orders yet." })), data?.orders?.map((order) => (_jsxs("div", { className: "mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "font-mono text-sm font-semibold text-gray-900", children: order.orderNumber }), _jsx("span", { className: "ml-3 text-xs text-gray-400", children: order.branchName })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-semibold text-gray-900", children: ["\u20B1", parseFloat(order.total).toFixed(2)] }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`, children: order.status })] })] }), _jsxs("div", { className: "text-xs text-gray-400", children: [new Date(order.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }), " · ", order.orderType.replace("_", " ")] }), order.items?.length > 0 && (_jsxs("div", { className: "mt-2 space-y-0.5", children: [order.items.slice(0, 3).map((item, i) => (_jsxs("div", { className: "text-xs text-gray-500", children: [item.serviceName ?? item.customName, " \u00D7 ", item.quantity] }, i))), order.items.length > 3 && (_jsxs("div", { className: "text-xs text-gray-400", children: ["+", order.items.length - 3, " more"] }))] }))] }, order.id)))] })] }) }));
}
export function AdminCustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("recent");
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    async function fetchCustomers() {
        setLoading(true);
        setError("");
        try {
            const res = await api.admin.customers.list({ page, pageSize: 20, sort, search });
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
    useEffect(() => { fetchCustomers(); }, [page, sort, search]);
    function handleSearch(e) {
        setSearch(e.target.value);
        setPage(1);
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Customers" }), _jsx("p", { className: "text-sm text-gray-500", children: meta ? `${meta.total.toLocaleString()} customers` : "Loading…" })] }), _jsxs("div", { className: "mb-6 flex items-center gap-4", children: [_jsx("input", { type: "text", value: search, onChange: handleSearch, placeholder: "Search by name or phone\u2026", className: "flex-1 max-w-sm rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none" }), _jsx("div", { className: "flex rounded-xl border border-gray-200 overflow-hidden", children: ["recent", "orders"].map((s) => (_jsx("button", { onClick: () => { setSort(s); setPage(1); }, className: `px-4 py-2 text-sm font-medium transition-colors ${sort === s ? "bg-brand-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`, children: s === "recent" ? "Most Recent" : "Most Orders" }, s))) })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), _jsx("div", { className: "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-100", children: _jsxs("tr", { children: [_jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Customer" }), _jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Phone" }), _jsx("th", { className: "px-5 py-3 text-left font-semibold text-gray-600", children: "Email" }), _jsx("th", { className: "px-5 py-3 text-right font-semibold text-gray-600", children: "Orders" }), _jsx("th", { className: "px-5 py-3 text-right font-semibold text-gray-600", children: "Last Order" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [loading && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-12 text-center text-gray-400", children: "Loading\u2026" }) })), !loading && customers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "py-12 text-center text-gray-400", children: "No customers found." }) })), customers.map((customer) => (_jsxs("tr", { onClick: () => setSelectedCustomer(customer.id), className: "hover:bg-gray-50 cursor-pointer transition-colors", children: [_jsxs("td", { className: "px-5 py-3", children: [_jsxs("div", { className: "font-medium text-gray-900", children: [customer.firstName, " ", customer.lastName] }), _jsx("div", { className: "text-xs text-gray-400", children: new Date(customer.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) })] }), _jsx("td", { className: "px-5 py-3 text-gray-600", children: customer.phone }), _jsx("td", { className: "px-5 py-3 text-gray-500", children: customer.email ?? "—" }), _jsx("td", { className: "px-5 py-3 text-right font-semibold text-gray-900", children: customer.totalOrders }), _jsx("td", { className: "px-5 py-3 text-right text-gray-500", children: customer.lastOrderDate
                                                ? new Date(customer.lastOrderDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                                                : "—" })] }, customer.id)))] })] }) }), meta && meta.totalPages > 1 && (_jsxs("div", { className: "mt-4 flex items-center justify-between text-sm", children: [_jsxs("span", { className: "text-gray-500", children: ["Page ", meta.page, " of ", meta.totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { disabled: meta.page <= 1, onClick: () => setPage((p) => p - 1), className: "rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50", children: "\u2190 Prev" }), _jsx("button", { disabled: meta.page >= meta.totalPages, onClick: () => setPage((p) => p + 1), className: "rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-40 hover:bg-gray-50", children: "Next \u2192" })] })] })), selectedCustomer && (_jsx(CustomerOrderHistory, { customerId: selectedCustomer, onClose: () => setSelectedCustomer(null) }))] }));
}
//# sourceMappingURL=Customers.js.map