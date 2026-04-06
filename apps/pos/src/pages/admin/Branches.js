import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
const EMPTY_FORM = {
    name: "",
    slug: "",
    address: "",
    phone: "",
    email: "",
    operatingHours: "",
};
function BranchModal({ initial, onSave, onClose, }) {
    const [form, setForm] = useState(initial
        ? {
            name: initial.name ?? "",
            slug: initial.slug ?? "",
            address: initial.address ?? "",
            phone: initial.phone ?? "",
            email: initial.email ?? "",
            operatingHours: initial.operatingHours ?? "",
        }
        : EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    function autoSlug(name) {
        return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    function handleNameChange(e) {
        const name = e.target.value;
        setForm((f) => ({
            ...f,
            name,
            slug: initial ? f.slug : autoSlug(name),
        }));
    }
    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.slug.trim()) {
            setError("Name and slug are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave(form);
            onClose();
        }
        catch (err) {
            setError(err.message ?? "Failed to save branch");
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-2xl bg-white shadow-2xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-100 px-6 py-4", children: [_jsx("h2", { className: "text-lg font-bold text-gray-900", children: initial ? "Edit Branch" : "Add Branch" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-2xl leading-none", children: "\u00D7" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6 space-y-4", children: [error && _jsx("div", { className: "rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700", children: error }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Branch Name *" }), _jsx("input", { type: "text", value: form.name, onChange: handleNameChange, placeholder: "e.g. Mandaue City", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Slug *" }), _jsxs("div", { className: "flex items-center rounded-xl border border-gray-200 overflow-hidden", children: [_jsx("span", { className: "bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-200", children: "/" }), _jsx("input", { type: "text", value: form.slug, onChange: (e) => setForm((f) => ({ ...f, slug: e.target.value })), placeholder: "mandaue-city", className: "flex-1 px-3 py-2.5 text-sm focus:outline-none", required: true })] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Address" }), _jsx("input", { type: "text", value: form.address, onChange: (e) => setForm((f) => ({ ...f, address: e.target.value })), placeholder: "A. Del Rosario Ave, Mandaue City", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Phone" }), _jsx("input", { type: "tel", value: form.phone, onChange: (e) => setForm((f) => ({ ...f, phone: e.target.value })), placeholder: "+63 32 344 0001", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Email" }), _jsx("input", { type: "email", value: form.email, onChange: (e) => setForm((f) => ({ ...f, email: e.target.value })), placeholder: "branch@auntsallys.ph", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide", children: "Operating Hours" }), _jsx("textarea", { rows: 3, value: form.operatingHours, onChange: (e) => setForm((f) => ({ ...f, operatingHours: e.target.value })), placeholder: "e.g. Mon\u2013Fri: 9AM\u20136PM | Sat: 9AM\u20133PM | Closed Sundays", className: "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none" })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { type: "submit", disabled: saving, className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40", children: saving ? "Saving…" : initial ? "Save Changes" : "Add Branch" })] })] })] }) }));
}
export function AdminBranchesPage() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    function fetchBranches() {
        setLoading(true);
        setError("");
        api.adminBranches.list()
            .then((res) => setBranches(res.data ?? []))
            .catch((err) => setError(err.message ?? "Failed to load branches"))
            .finally(() => setLoading(false));
    }
    useEffect(() => { fetchBranches(); }, []);
    async function handleSave(form) {
        const payload = {
            name: form.name,
            slug: form.slug,
            address: form.address || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            operatingHours: form.operatingHours || undefined,
        };
        if (editTarget) {
            await api.adminBranches.update(editTarget.id, payload);
        }
        else {
            await api.adminBranches.create(payload);
        }
        fetchBranches();
    }
    async function toggleActive(branch) {
        setTogglingId(branch.id);
        try {
            await api.adminBranches.update(branch.id, { isActive: !branch.isActive });
            fetchBranches();
        }
        catch (err) {
            setError(err.message ?? "Failed to update branch");
        }
        finally {
            setTogglingId(null);
        }
    }
    function openEdit(branch) {
        setEditTarget(branch);
        setShowModal(true);
    }
    function openAdd() {
        setEditTarget(null);
        setShowModal(true);
    }
    return (_jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Branches" }), _jsx("button", { onClick: openAdd, className: "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700", children: "+ Add Branch" })] }), error && (_jsx("div", { className: "mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700", children: error })), loading ? (_jsx("div", { className: "py-12 text-center text-gray-400", children: "Loading\u2026" })) : (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [branches.length === 0 && (_jsx("div", { className: "col-span-2 py-12 text-center text-gray-400", children: "No branches yet." })), branches.map((branch) => (_jsxs("div", { className: `rounded-xl border bg-white p-6 shadow-sm transition-opacity ${branch.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`, children: [_jsxs("div", { className: "mb-3 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: branch.name }), _jsxs("code", { className: "text-xs text-gray-400", children: ["/", branch.slug] })] }), _jsx("span", { className: `rounded-full px-2.5 py-0.5 text-xs font-medium ${branch.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`, children: branch.isActive ? "Active" : "Inactive" })] }), branch.address && _jsx("p", { className: "mb-1 text-sm text-gray-500", children: branch.address }), branch.phone && _jsx("p", { className: "mb-1 text-sm text-gray-500", children: branch.phone }), branch.email && _jsx("p", { className: "mb-1 text-sm text-gray-500", children: branch.email }), branch.operatingHours && (_jsxs("p", { className: "mb-4 text-xs text-gray-400 leading-relaxed", children: ["\uD83D\uDD50 ", branch.operatingHours] })), _jsxs("div", { className: "flex gap-2 mt-4", children: [_jsx("button", { onClick: () => openEdit(branch), className: "flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50", children: "Edit" }), _jsx("button", { onClick: () => toggleActive(branch), disabled: togglingId === branch.id, className: "flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40", children: togglingId === branch.id ? "…" : branch.isActive ? "Deactivate" : "Activate" })] })] }, branch.id)))] })), showModal && (_jsx(BranchModal, { initial: editTarget, onSave: handleSave, onClose: () => { setShowModal(false); setEditTarget(null); } }))] }));
}
//# sourceMappingURL=Branches.js.map