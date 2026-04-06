import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { api } from "../../lib/api";
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BRANCHES = [
    { id: "all", name: "All Branches" },
    { id: "f9437afe-d70e-49df-b33a-f86f11742078", name: "Arton" },
    { id: "601c564b-ce8e-48f0-b7b2-f48e2fefb884", name: "Ayala 30th" },
    { id: "93084732-fcd9-4cd0-95d8-45342fa70743", name: "Tiendesitas" },
    { id: "c8a3216c-a340-4103-898b-e000699beb52", name: "Xavierville" },
];
const DATE_PRESETS = [
    { id: "today", label: "Today" },
    { id: "last7", label: "Last 7 Days" },
    { id: "first15", label: "1st–15th" },
    { id: "last16", label: "16th–End" },
    { id: "fullMonth", label: "Full Month" },
    { id: "custom", label: "Custom" },
];
const STATUS_COLOR = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    picked_up: "bg-purple-100 text-purple-700",
    out_for_pickup: "bg-purple-100 text-purple-700",
    processing: "bg-indigo-100 text-indigo-700",
    ready: "bg-teal-100 text-teal-700",
    out_for_delivery: "bg-orange-100 text-orange-700",
    assigned_for_pickup: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    collected: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    transferred: "bg-gray-100 text-gray-600",
};
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDateRange(preset) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const year = now.getFullYear();
    const month = now.getMonth();
    switch (preset) {
        case "today": return { from: today, to: today };
        case "last7": {
            const d = new Date(now);
            d.setDate(d.getDate() - 6);
            return { from: d.toISOString().split("T")[0], to: today };
        }
        case "first15":
            return {
                from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
                to: `${year}-${String(month + 1).padStart(2, "0")}-15`,
            };
        case "last16": {
            const lastDay = new Date(year, month + 1, 0).getDate();
            return {
                from: `${year}-${String(month + 1).padStart(2, "0")}-16`,
                to: `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`,
            };
        }
        case "fullMonth": {
            const lastDay = new Date(year, month + 1, 0).getDate();
            return {
                from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
                to: `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`,
            };
        }
        default: return { from: today, to: today };
    }
}
function fmt(n) {
    return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function exportToExcel(data, branchName, from, to) {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Summary
    const summaryData = [
        ["Metric", "Value"],
        ["Total Orders", data.summary.totalOrders],
        ["Total Revenue", `₱${data.summary.totalRevenue.toLocaleString()}`],
        ["Avg Order Value", `₱${data.summary.avgOrderValue.toFixed(2)}`],
        ["New Customers", data.summary.newCustomers],
        ["Completed Orders", data.summary.completedOrders],
        ["Cancelled Orders", data.summary.cancelledOrders],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");
    // Sheet 2: Orders
    const ordersHeaders = ["Order #", "Customer", "Branch", "Status", "Type", "Total", "Date", "Services"];
    const ordersData = [
        ordersHeaders,
        ...data.orders.map((o) => [
            o.orderNumber,
            o.customerName,
            o.branchName,
            o.status,
            o.orderType,
            `₱${parseFloat(o.total).toFixed(2)}`,
            new Date(o.createdAt).toLocaleDateString("en-PH"),
            o.services,
        ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersData), "Orders");
    // Sheet 3: Revenue by Day
    const revenueHeaders = ["Date", "Orders", "Revenue"];
    const revenueData = [
        revenueHeaders,
        ...data.revenueByDay.map((r) => [r.date, r.orders, `₱${r.revenue.toLocaleString()}`]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueData), "Revenue by Day");
    // Sheet 4: Top Services
    const servicesHeaders = ["Service", "Quantity", "Revenue"];
    const servicesData = [
        servicesHeaders,
        ...data.topServices.map((s) => [s.name, s.quantity, `₱${s.revenue.toLocaleString()}`]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(servicesData), "Top Services");
    XLSX.writeFile(wb, `auntsallys-${branchName}-${from}-to-${to}.xlsx`);
}
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AnalyticsDashboard() {
    const [branchId, setBranchId] = useState("all");
    const [datePreset, setDatePreset] = useState("fullMonth");
    const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().split("T")[0]);
    const [customTo, setCustomTo] = useState(() => new Date().toISOString().split("T")[0]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const dateRange = datePreset === "custom"
        ? { from: customFrom, to: customTo }
        : getDateRange(datePreset);
    const branchName = BRANCHES.find((b) => b.id === branchId)?.name ?? "All Branches";
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.analytics.dashboard({
                branchId: branchId === "all" ? undefined : branchId,
                from: dateRange.from,
                to: dateRange.to,
            });
            if (res.success)
                setData(res.data);
            else
                setError("API returned error");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load analytics");
        }
        finally {
            setLoading(false);
        }
    }, [branchId, dateRange.from, dateRange.to]);
    useEffect(() => { load(); }, [load]);
    return (_jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900", children: "Analytics" }), _jsxs("p", { className: "text-sm text-gray-500", children: [branchName, " \u00B7 ", dateRange.from, " to ", dateRange.to] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: load, className: "rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors", title: "Refresh", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }) }), data && (_jsxs("button", { onClick: () => exportToExcel(data, branchName.replace(/\s+/g, "-"), dateRange.from, dateRange.to), className: "rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2", children: [_jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }), "Export Excel"] }))] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-4 space-y-3", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: BRANCHES.map((b) => (_jsx("button", { onClick: () => setBranchId(b.id), className: `rounded-full px-3 py-1 text-sm font-medium transition-colors ${branchId === b.id
                                ? "bg-brand-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`, children: b.name }, b.id))) }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [DATE_PRESETS.map((p) => (_jsx("button", { onClick: () => setDatePreset(p.id), className: `rounded-full px-3 py-1 text-sm font-medium transition-colors ${datePreset === p.id
                                    ? "bg-brand-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`, children: p.label }, p.id))), datePreset === "custom" && (_jsxs("div", { className: "flex items-center gap-2 ml-2", children: [_jsx("input", { type: "date", value: customFrom, onChange: (e) => setCustomFrom(e.target.value), className: "rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" }), _jsx("span", { className: "text-sm text-gray-400", children: "to" }), _jsx("input", { type: "date", value: customTo, onChange: (e) => setCustomTo(e.target.value), className: "rounded-lg border border-gray-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" })] }))] })] }), error && (_jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600", children: error })), loading && (_jsx("div", { className: "flex h-48 items-center justify-center text-gray-400 text-sm", children: "Loading\u2026" })), !loading && data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", children: [_jsx(MetricCard, { label: "Total Orders", value: data.summary.totalOrders.toLocaleString() }), _jsx(MetricCard, { label: "Total Revenue", value: fmt(data.summary.totalRevenue) }), _jsx(MetricCard, { label: "Avg Order Value", value: fmt(data.summary.avgOrderValue) }), _jsx(MetricCard, { label: "New Customers", value: data.summary.newCustomers.toLocaleString() }), _jsx(MetricCard, { label: "Completed", value: data.summary.completedOrders.toLocaleString(), accent: "green" }), _jsx(MetricCard, { label: "Cancelled", value: data.summary.cancelledOrders.toLocaleString(), accent: "red" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-gray-700", children: "Orders by Status" }), _jsxs("div", { className: "space-y-2", children: [data.ordersByStatus.sort((a, b) => b.count - a.count).map((s) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-600"}`, children: s.status.replace(/_/g, " ") }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: s.count })] }, s.status))), data.ordersByStatus.length === 0 && _jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No data" })] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-gray-700", children: "Orders by Type" }), _jsxs("div", { className: "space-y-3", children: [data.ordersByType.map((t) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600 capitalize", children: t.type.replace(/_/g, " ") }), _jsx("span", { className: "text-sm font-semibold text-gray-900", children: t.count })] }, t.type))), data.ordersByType.length === 0 && _jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No data" })] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-5", children: [_jsx("h2", { className: "mb-4 text-sm font-semibold text-gray-700", children: "Top Services" }), _jsxs("div", { className: "space-y-2", children: [data.topServices.map((s, i) => (_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "w-5 shrink-0 text-xs font-bold text-gray-300 pt-0.5", children: i + 1 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-800 truncate", children: s.name }), _jsxs("p", { className: "text-xs text-gray-400", children: [s.quantity, "\u00D7 ordered"] })] }), _jsx("span", { className: "text-sm font-semibold text-gray-900 shrink-0", children: fmt(s.revenue) })] }, s.name))), data.topServices.length === 0 && _jsx("p", { className: "text-sm text-gray-400 text-center py-4", children: "No data" })] })] })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white", children: [_jsx("div", { className: "border-b border-gray-100 px-5 py-4", children: _jsx("h2", { className: "text-sm font-semibold text-gray-700", children: "Revenue by Day" }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-50", children: [_jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Date" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Orders" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Revenue" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [data.revenueByDay.map((r) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-5 py-3 text-gray-700", children: r.date }), _jsx("td", { className: "px-5 py-3 text-right text-gray-600", children: r.orders }), _jsx("td", { className: "px-5 py-3 text-right font-semibold text-gray-900", children: fmt(r.revenue) })] }, r.date))), data.revenueByDay.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-5 py-8 text-center text-sm text-gray-400", children: "No revenue data." }) }))] })] }) })] }), _jsxs("div", { className: "rounded-xl border border-gray-100 bg-white", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-5 py-4", children: [_jsx("h2", { className: "text-sm font-semibold text-gray-700", children: "All Orders" }), _jsxs("span", { className: "text-xs text-gray-400", children: [data.orders.length, " orders"] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-50", children: [_jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Order #" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Customer" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Branch" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Type" }), _jsx("th", { className: "px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400", children: "Status" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Total" }), _jsx("th", { className: "px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400", children: "Date" })] }) }), _jsxs("tbody", { className: "divide-y divide-gray-50", children: [data.orders.map((o) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-colors", children: [_jsx("td", { className: "px-5 py-3 font-mono text-xs text-gray-600", children: o.orderNumber }), _jsx("td", { className: "px-5 py-3 text-gray-700", children: o.customerName }), _jsx("td", { className: "px-5 py-3 text-gray-500", children: o.branchName.replace(/Aunt Sally's\s*[—–-]\s*/i, "") }), _jsx("td", { className: "px-5 py-3 text-gray-500 capitalize", children: o.orderType.replace(/_/g, " ") }), _jsx("td", { className: "px-5 py-3", children: _jsx("span", { className: `rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`, children: o.status.replace(/_/g, " ") }) }), _jsx("td", { className: "px-5 py-3 text-right font-semibold text-gray-900", children: fmt(parseFloat(o.total)) }), _jsx("td", { className: "px-5 py-3 text-right text-xs text-gray-400", children: new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) })] }, o.orderNumber))), data.orders.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-5 py-8 text-center text-sm text-gray-400", children: "No orders in this range." }) }))] })] }) })] })] }))] }));
}
// ---------------------------------------------------------------------------
// MetricCard sub-component
// ---------------------------------------------------------------------------
function MetricCard({ label, value, accent, }) {
    const valueColor = accent === "green"
        ? "text-green-700"
        : accent === "red"
            ? "text-red-600"
            : "text-gray-900";
    return (_jsxs("div", { className: "rounded-xl border border-gray-100 bg-white p-4", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-gray-400", children: label }), _jsx("p", { className: `mt-2 text-xl font-bold ${valueColor}`, children: value })] }));
}
// Alias for router compatibility
export { AnalyticsDashboard as AdminAnalyticsPage };
//# sourceMappingURL=Analytics.js.map