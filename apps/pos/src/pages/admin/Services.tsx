import { useState, useEffect } from "react";
import { api } from "../../lib/api";

const CATEGORIES = [
  { value: "wash_dry_fold",  label: "Wash, Dry & Fold" },
  { value: "wash_dry_press", label: "Wash, Dry & Press" },
  { value: "dry_only",       label: "Dry Only" },
  { value: "heavy_wash",     label: "Heavy Wash" },
  { value: "comforter",      label: "Comforter" },
  { value: "dry_clean",      label: "Dry Clean" },
  { value: "addon",          label: "Add-ons" },
  { value: "logistics",      label: "Logistics" },
];

const PRICE_UNITS = ["kg", "piece", "pair", "load"];

const CATEGORY_COLORS: Record<string, string> = {
  wash_dry_fold:  "bg-blue-100 text-blue-700",
  wash_dry_press: "bg-cyan-100 text-cyan-700",
  dry_only:       "bg-sky-100 text-sky-700",
  heavy_wash:     "bg-indigo-100 text-indigo-700",
  comforter:      "bg-violet-100 text-violet-700",
  dry_clean:      "bg-purple-100 text-purple-700",
  addon:          "bg-pink-100 text-pink-700",
  logistics:      "bg-orange-100 text-orange-700",
};

interface ServiceForm {
  name: string;
  category: string;
  basePrice: string;
  priceUnit: string;
  estimatedHours: string;
  description: string;
}

const EMPTY_FORM: ServiceForm = {
  name: "",
  category: "wash_dry_fold",
  basePrice: "",
  priceUnit: "kg",
  estimatedHours: "",
  description: "",
};

function ServiceModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: any;
  onSave: (data: ServiceForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ServiceForm>(
    initial
      ? {
          name: initial.name ?? "",
          category: initial.category ?? "wash_dry_fold",
          basePrice: String(initial.basePrice ?? ""),
          priceUnit: initial.priceUnit ?? "kg",
          estimatedHours: String(initial.estimatedHours ?? ""),
          description: initial.description ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
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
    } catch (err: any) {
      setError(err.message ?? "Failed to save service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Service" : "Add Service"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Wash & Fold"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Unit</label>
              <select
                value={form.priceUnit}
                onChange={(e) => setForm((f) => ({ ...f, priceUnit: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                {PRICE_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Base Price (₱) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
                placeholder="65.00"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Hours</label>
              <input
                type="number"
                min="0"
                value={form.estimatedHours}
                onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))}
                placeholder="4"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description…"
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  function fetchServices() {
    setLoading(true);
    setError("");
    api.adminServices.list()
      .then((res) => setServices(res.data ?? []))
      .catch((err: any) => setError(err.message ?? "Failed to load services"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchServices(); }, []);

  async function handleSave(form: ServiceForm) {
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
    } else {
      await api.adminServices.create(payload);
    }
    fetchServices();
  }

  async function toggleActive(service: any) {
    setTogglingId(service.id);
    try {
      await api.adminServices.update(service.id, { isActive: !service.isActive });
      fetchServices();
    } catch (err: any) {
      setError(err.message ?? "Failed to update service");
    } finally {
      setTogglingId(null);
    }
  }

  function openEdit(service: any) {
    setEditTarget(service);
    setShowModal(true);
  }

  function openAdd() {
    setEditTarget(null);
    setShowModal(true);
  }

  async function handleDelete(service: any) {
    setDeletingId(service.id);
    setDeleteConfirm(null);
    try {
      await api.adminServices.delete(service.id);
      fetchServices();
    } catch (err: any) {
      setError(err.message ?? "Failed to delete service");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Service
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Service</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Base Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Turnaround</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : services.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No services yet.</td></tr>
            ) : services.map((service) => (
              <tr key={service.id} className={`hover:bg-gray-50 transition-colors ${!service.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{service.name}</div>
                  {service.description && <div className="text-xs text-gray-400 mt-0.5">{service.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[service.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {CATEGORIES.find((c) => c.value === service.category)?.label ?? service.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  ₱{parseFloat(service.basePrice).toLocaleString()}/{service.priceUnit}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {service.estimatedHours ? `~${service.estimatedHours}h` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(service)}
                      className="text-xs text-brand-600 hover:underline font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(service)}
                      disabled={togglingId === service.id}
                      className="text-xs text-gray-500 hover:underline disabled:opacity-40"
                    >
                      {togglingId === service.id ? "…" : service.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(service)}
                      disabled={deletingId === service.id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-40"
                    >
                      {deletingId === service.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ServiceModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Service?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Delete <strong>{deleteConfirm.name}</strong>? This will remove it from all branches.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
