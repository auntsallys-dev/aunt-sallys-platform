import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const ORDERS = [
    { id: "1", number: "AS-2026-00024", customer: "Maria Santos", branch: "Mandaue", total: "₱325", status: "processing", date: "Mar 18, 2026", type: "walk_in" },
    { id: "2", number: "AS-2026-00023", customer: "Juan Dela Cruz", branch: "IT Park", total: "₱450", status: "ready", date: "Mar 18, 2026", type: "delivery" },
    { id: "3", number: "AS-2026-00022", customer: "Ana Reyes", branch: "Consolacion", total: "₱180", status: "completed", date: "Mar 17, 2026", type: "walk_in" },
    { id: "4", number: "AS-2026-00021", customer: "Carlos Tan", branch: "Lapu-Lapu", total: "₱640", status: "pending", date: "Mar 18, 2026", type: "pickup" },
    { id: "5", number: "AS-2026-00020", customer: "Rosa Garcia", branch: "Mandaue", total: "₱290", status: "cancelled", date: "Mar 17, 2026", type: "walk_in" },
];
const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    processing: "bg-purple-100 text-purple-700",
    ready: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};
export function AdminOrdersPage() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const filtered = ORDERS.filter((o) => {
        const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) ||
            o.customer.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "all" || o.status === statusFilter;
        return matchSearch && matchStatus;
    });
    return (_jsxs("div", { className: "p-8", children: [_jsx("div", { className: "mb-6 flex items-center justify-between", children: _jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Orders" }) }), _jsxs("div", { className: "mb-4 flex gap-3", children: [_jsx("input", { type: "text", placeholder: "Search by order # or customer...", value: search, onChange: (e) => setSearch(e.target.value), className: "flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none", children: [_jsx("option", { value: "all", children: "All Statuses" }), ["pending", "confirmed", "processing", "ready", "completed", "cancelled"].map((s) => (_jsx("option", { value: s, className: "capitalize", children: s }, s)))] })] }), _jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-gray-100 bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Order #" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Customer" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Branch" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Type" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Total" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Date" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [filtered.map((o) => (_jsxs("tr", { className: "hover:bg-gray-50 cursor-pointer", children: [_jsx("td", { className: "px-4 py-3 font-mono font-medium text-gray-900", children: o.number }), _jsx("td", { className: "px-4 py-3 text-gray-700", children: o.customer }), _jsx("td", { className: "px-4 py-3 text-gray-600", children: o.branch }), _jsx("td", { className: "px-4 py-3 capitalize text-gray-500", children: o.type.replace("_", " ") }), _jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: o.total }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`, children: o.status }) }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: o.date })] }, o.id))), filtered.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-4 py-8 text-center text-gray-400", children: "No orders found." }) }))] })] }) })] }));
}
//# sourceMappingURL=Orders.js.map