import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const SERVICES = [
    { id: "1", name: "Wash & Fold", category: "wash", basePrice: 65, priceUnit: "kg", estimatedHours: 4, isActive: true },
    { id: "2", name: "Wash & Iron", category: "wash", basePrice: 90, priceUnit: "kg", estimatedHours: 6, isActive: true },
    { id: "3", name: "Dry Clean", category: "dry_clean", basePrice: 150, priceUnit: "piece", estimatedHours: 24, isActive: true },
    { id: "4", name: "Iron Only", category: "iron", basePrice: 40, priceUnit: "piece", estimatedHours: 2, isActive: true },
    { id: "5", name: "Beddings & Linens", category: "wash", basePrice: 120, priceUnit: "piece", estimatedHours: 8, isActive: true },
    { id: "6", name: "Sneaker Cleaning", category: "special", basePrice: 250, priceUnit: "pair", estimatedHours: 48, isActive: true },
    { id: "7", name: "Express Wash & Fold", category: "wash", basePrice: 90, priceUnit: "kg", estimatedHours: 6, isActive: true },
];
const CATEGORY_COLORS = {
    wash: "bg-blue-100 text-blue-700",
    dry_clean: "bg-purple-100 text-purple-700",
    iron: "bg-orange-100 text-orange-700",
    special: "bg-pink-100 text-pink-700",
};
export function AdminServicesPage() {
    const [services, setServices] = useState(SERVICES);
    function toggleActive(id) {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Services" }), _jsx("button", { className: "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700", children: "+ Add Service" })] }), _jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-gray-100 bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Service" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Category" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Base Price" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Turnaround" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-50", children: services.map((service) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 font-medium text-gray-900", children: service.name }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[service.category] ?? "bg-gray-100 text-gray-600"}`, children: service.category.replace("_", " ") }) }), _jsxs("td", { className: "px-4 py-3 text-gray-700", children: ["\u20B1", service.basePrice, "/", service.priceUnit] }), _jsxs("td", { className: "px-4 py-3 text-gray-500", children: ["~", service.estimatedHours, "h"] }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`, children: service.isActive ? "Active" : "Inactive" }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "text-xs text-brand-600 hover:underline", children: "Edit" }), _jsx("button", { onClick: () => toggleActive(service.id), className: "text-xs text-gray-500 hover:underline", children: service.isActive ? "Disable" : "Enable" })] }) })] }, service.id))) })] }) })] }));
}
//# sourceMappingURL=Services.js.map