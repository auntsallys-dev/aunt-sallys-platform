import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface BranchForm {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  operatingHours: string;
}

const EMPTY_FORM: BranchForm = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  email: "",
  operatingHours: "",
};

function BranchModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: any;
  onSave: (data: BranchForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BranchForm>(
    initial
      ? {
          name: initial.name ?? "",
          slug: initial.slug ?? "",
          address: initial.address ?? "",
          phone: initial.phone ?? "",
          email: initial.email ?? "",
          operatingHours: initial.operatingHours ?? "",
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      slug: initial ? f.slug : autoSlug(name),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
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
    } catch (err: any) {
      setError(err.message ?? "Failed to save branch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Branch" : "Add Branch"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g. Mandaue City"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug *</label>
            <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden">
              <span className="bg-gray-50 px-3 py-2.5 text-sm text-gray-400 border-r border-gray-200">/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="mandaue-city"
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="A. Del Rosario Ave, Mandaue City"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+63 32 344 0001"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="branch@auntsallys.ph"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wide">Operating Hours</label>
            <textarea
              rows={3}
              value={form.operatingHours}
              onChange={(e) => setForm((f) => ({ ...f, operatingHours: e.target.value }))}
              placeholder="e.g. Mon–Fri: 9AM–6PM | Sat: 9AM–3PM | Closed Sundays"
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
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminBranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function fetchBranches() {
    setLoading(true);
    setError("");
    api.adminBranches.list()
      .then((res) => setBranches(res.data ?? []))
      .catch((err: any) => setError(err.message ?? "Failed to load branches"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchBranches(); }, []);

  async function handleSave(form: BranchForm) {
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
    } else {
      await api.adminBranches.create(payload);
    }
    fetchBranches();
  }

  async function toggleActive(branch: any) {
    setTogglingId(branch.id);
    try {
      await api.adminBranches.update(branch.id, { isActive: !branch.isActive });
      fetchBranches();
    } catch (err: any) {
      setError(err.message ?? "Failed to update branch");
    } finally {
      setTogglingId(null);
    }
  }

  function openEdit(branch: any) {
    setEditTarget(branch);
    setShowModal(true);
  }

  function openAdd() {
    setEditTarget(null);
    setShowModal(true);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Branch
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.length === 0 && (
            <div className="col-span-2 py-12 text-center text-gray-400">No branches yet.</div>
          )}
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`rounded-xl border bg-white p-6 shadow-sm transition-opacity ${
                branch.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                  <code className="text-xs text-gray-400">/{branch.slug}</code>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  branch.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {branch.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {branch.address && <p className="mb-1 text-sm text-gray-500">{branch.address}</p>}
              {branch.phone && <p className="mb-1 text-sm text-gray-500">{branch.phone}</p>}
              {branch.email && <p className="mb-1 text-sm text-gray-500">{branch.email}</p>}
              {branch.operatingHours && (
                <p className="mb-4 text-xs text-gray-400 leading-relaxed">
                  🕐 {branch.operatingHours}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEdit(branch)}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(branch)}
                  disabled={togglingId === branch.id}
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  {togglingId === branch.id ? "…" : branch.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BranchModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
