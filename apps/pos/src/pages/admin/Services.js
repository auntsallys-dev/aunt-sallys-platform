import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
const CATEGORIES = [
    { value: "wash_dry_fold", label: "Wash, Dry & Fold" },
    { value: "wash_dry_press", label: "Wash, Dry & Press" },
    { value: "dry_only", label: "Dry Only" },
    { value: "heavy_wash", label: "Heavy Wash" },
    { value: "comforter", label: "Comforter" },
    { value: "dry_clean", label: "Dry Clean" },
    { value: "addon", label: "Add-ons" },
    { value: "logistics", label: "Logistics" },
];
const PRICE_UNITS = ["kg", "piece", "pair", "load"];
const CATEGORY_COLORS = {
    wash_dry_fold: "bg-blue-100 text-blue-700",
    wash_dry_press: "bg-cyan-100 text-cyan-700",
    dry_only: "bg-sky-100 text-sky-700",
    heavy_wash: "bg-indigo-100 text-indigo-700",
    comforter: "bg-violet-100 text-violet-700",
    dry_clean: "bg-purple-100 text-purple-700",
    addon: "bg-pink-100 text-pink-700",
    logistics: "bg-orange-100 text-orange-700",
};
const EMPTY_FORM = {
    name: "",
    category: "wash_dry_fold",
    basePrice: "",
    priceUnit: "kg",
    estimatedHours: "",
    description: "",
};
function ServiceModal({ initial, onSave, onClose, }) {
    const [form, setForm] = useState(initial
        ? {
            name: initial.name ?? "",
            category: initial.category ?? "wash_dry_fold",
            basePrice: String(initial.basePrice ?? ""),
            priceUnit: initial.priceUnit ?? "kg",
            estimatedHours: String(initial.estimatedHours ?? ""),
            description: initial.description ?? "",
        }
        : EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.basePrice) {
            setError("Name and price are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave(form);
            onClose();
        }
        catch (err) {
            setError(err.message ?? "Failed to save service");
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl bg-white shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-6 py-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-900", children: initial ? "Edit Service" : "Add Service" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [error && _jsx("div", { className: "rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700", children: error }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Service Name *" }), _jsx("input", { type: "text", value: form.name, onChange: (e) => setForm((f) => ({ ...f, name: e.target.value })), placeholder: "e.g. Wash & Fold", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Category" }), _jsx("select", { value: form.category, onChange: (e) => setForm((f) => ({ ...f, category: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", children: CATEGORIES.map((c) => (_jsx("option", { value: c.value, children: c.label }, c.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Price Unit" }), _jsx("select", { value: form.priceUnit, onChange: (e) => setForm((f) => ({ ...f, priceUnit: e.target.value })), className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", children: PRICE_UNITS.map((u) => (_jsx("option", { value: u, children: u }, u))) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Base Price (\u20B1) *" }), _jsx("input", { type: "number", min: "0", step: "0.01", value: form.basePrice, onChange: (e) => setForm((f) => ({ ...f, basePrice: e.target.value })), placeholder: "65.00", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Est. Hours" }), _jsx("input", { type: "number", min: "0", value: form.estimatedHours, onChange: (e) => setForm((f) => ({ ...f, estimatedHours: e.target.value })), placeholder: "4", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Description" }), _jsx("textarea", { value: form.description, onChange: (e) => setForm((f) => ({ ...f, description: e.target.value })), placeholder: "Optional description\u2026", rows: 2, className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none" })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40", children: saving ? "Saving…" : initial ? "Save Changes" : "Add Service" })] })] })] }) }));
}
export function AdminServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    function fetchServices() {
        setLoading(true);
        setError("");
        api.adminServices.list()
            .then((res) => setServices(res.data ?? []))
            .catch((err) => setError(err.message ?? "Failed to load services"))
            .finally(() => setLoading(false));
    }
    useEffect(() => { fetchServices(); }, []);
    async function handleSave(form) {
        const payload = {
            name: form.name,
            category: form.category,
            basePrice: parseFloat(form.basePrice),
            priceUnit: form.priceUnit,
            estimatedHours: form.estimatedHours ? parseInt(form.estimatedHours) : undefined,
            description: form.description || undefined,
        };
        if (editTarget) {
            await api.adminServices.update(editTarget.id, payload);
        }
        else {
            await api.adminServices.create(payload);
        }
        fetchServices();
    }
    async function toggleActive(service) {
        setTogglingId(service.id);
        try {
            await api.adminServices.update(service.id, { isActive: !service.isActive });
            fetchServices();
        }
        catch (err) {
            setError(err.message ?? "Failed to update service");
        }
        finally {
            setTogglingId(null);
        }
    }
    function openEdit(service) {
        setEditTarget(service);
        setShowModal(true);
    }
    function openAdd() {
        setEditTarget(null);
        setShowModal(true);
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Services" }), _jsx("button", { onClick: openAdd, className: "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700", children: "+ Add Service" })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), _jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "border-b border-gray-100 bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Service" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Category" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Base Price" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Turnaround" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Status" }), _jsx("th", { className: "px-4 py-3 text-left font-medium text-gray-500", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-50", children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-8 text-center text-gray-400", children: "Loading\u2026" }) })) : services.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-8 text-center text-gray-400", children: "No services yet." }) })) : services.map((service) => (_jsxs("tr", { className: `hover:bg-gray-50 transition-colors ${!service.isActive ? "opacity-50" : ""}`, children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "font-medium text-gray-900", children: service.name }), service.description && _jsx("div", { className: "text-xs text-gray-400 mt-0.5", children: service.description })] }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[service.category] ?? "bg-gray-100 text-gray-600"}`, children: CATEGORIES.find((c) => c.value === service.category)?.label ?? service.category }) }), _jsxs("td", { className: "px-4 py-3 text-gray-700", children: ["\u20B1", parseFloat(service.basePrice).toLocaleString(), "/", service.priceUnit] }), _jsx("td", { className: "px-4 py-3 text-gray-500", children: service.estimatedHours ? `~${service.estimatedHours}h` : "—" }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`, children: service.isActive ? "Active" : "Inactive" }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => openEdit(service), className: "text-xs text-brand-600 hover:underline font-medium", children: "Edit" }), _jsx("button", { onClick: () => toggleActive(service), disabled: togglingId === service.id, className: "text-xs text-gray-500 hover:underline disabled:opacity-40", children: togglingId === service.id ? "…" : service.isActive ? "Disable" : "Enable" })] }) })] }, service.id))) })] }) }), showModal && (_jsx(ServiceModal, { initial: editTarget, onSave: handleSave, onClose: () => { setShowModal(false); setEditTarget(null); } }))] }));
}
//# sourceMappingURL=Services.js.map