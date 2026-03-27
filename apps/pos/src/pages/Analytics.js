import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
const STATUS_COLOR = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    picked_up: "bg-purple-100 text-purple-700",
    processing: "bg-indigo-100 text-indigo-700",
    ready: "bg-teal-100 text-teal-700",
    out_for_delivery: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};
function fmt(n) {
    return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function shortBranchName(name) {
    return name.replace(/Aunt Sally's\s*[—–-]\s*/i, "");
}
export function AnalyticsPage() {
    const [period, setPeriod] = useState("month");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.analytics.overview(period);
            if (res.success)
                setData(res.data);
        }
        catch (e) {
            setError(e.message ?? "Failed to load analytics");
        }
        finally {
            setLoading(false);
        }
    }, [period]);
    useEffect(() => { load(); }, [load]);
    const maxRevenue = data ? Math.max(...data.branchStats.map((b) => b.revenue), 1) : 1;
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900", children: "Analytics" }), _jsx("p", { className: "text-sm text-gray-500", children: "Cross-branch business overview" })] }), _jsxs("div", { className: "flex gap-2", children: [["today", "week", "month"].map((p) => (_jsx("button", { onClick: () => setPeriod(p), className: `rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${period === p
                                    ? "bg-brand-600 text-white"
                                    : "bg-white border border-gray-200 text-gray-600 hover:border-brand-400"}`, children: p === "today" ? "Today" : p === "week" ? "Last 7 Days" : "This Month" }, p))), _jsx("button", { onClick: load, className: "rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors", title: "Refresh", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }) })] })] }), error && (_jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600", children: error })), loading && (_jsx("div", { className: "flex h-48 items-center justify-center text-gray-400 text-sm", children: "Loading\u2026" })), !loading && data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-gray-400", children: "Total Revenue" }), _jsx("p", { className: "mt-2 text-2xl font-bold text-gray-900", children: fmt(data.summary.totalRevenue) })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-gray-400", children: "Total Orders" }), _jsx("p", { className: "mt-2 text-2xl font-bold text-gray-900", children: data.summary.totalOrders.toLocaleString() })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-gray-400", children: "New Customers" }), _jsx("p", { className: "mt-2 text-2xl font-bold text-gray-900", children: data.summary.newCustomers.toLocaleString() })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-gray-700", children: "Revenue by Branch" }), _jsxs("div", { className: "space-y-4", children: [data.branchStats.map((b) => (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-sm mb-1", children: [_jsx("span", { className: "font-medium text-gray-700", children: shortBranchName(b.name) }), _jsx("span", { className: "text-gray-900 font-semibold", children: fmt(b.revenue) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex-1 rounded-full bg-gray-100 h-2", children: _jsx("div", { className: "h-2 rounded-full bg-brand-500 transition-all", style: { width: `${(b.revenue / maxRevenue) * 100}%` } }) }), _jsxs("span", { className: "text-xs text-gray-400 w-16 text-right", children: [b.orders, " orders"] })] })] }, b.id))), data.branchStats.length === 0 && (_jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No orders yet for this period." }))] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-gray-700", children: "Top Services" }), _jsxs("div", { className: "space-y-3", children: [data.topServices.map((s, i) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "w-5 text-xs font-bold text-gray-300", children: i + 1 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-800 truncate", children: s.name }), _jsxs("p", { className: "text-xs text-gray-400", children: [s.count % 1 === 0 ? s.count : s.count.toFixed(1), "\u00D7 ordered"] })] }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: fmt(s.revenue) })] }, s.name))), data.topServices.length === 0 && (_jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No services logged yet." }))] })] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-5 py-4", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-700", children: "Recent Orders (All Branches)" }), _jsx("span", { className: "text-xs text-gray-400", children: "Last 20" })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-50", children: [_jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Order #" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Branch" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Type" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Status" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Total" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Date" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [data.recentOrders.map((o) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-5 py-3 font-mono text-xs text-gray-600", children: o.orderNumber }), _jsx("td", { className: "px-5 py-3 text-gray-700", children: shortBranchName(o.branchName) }), _jsx("td", { className: "px-5 py-3 text-gray-500 capitalize", children: o.orderType.replace("_", " ") }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`, children: o.status.replace("_", " ") }) }), _jsx("td", { className: "px-5 py-3 text-right font-semibold text-gray-900", children: fmt(parseFloat(o.total)) }), _jsx("td", { className: "px-5 py-3 text-right text-xs text-gray-400", children: new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })] }, o.id))), data.recentOrders.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-5 py-8 text-center text-sm text-gray-400", children: "No orders yet." }) }))] })] }) })] })] }))] }));
}
//# sourceMappingURL=Analytics.js.map