import { useState } from "react";

interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  isActive: boolean;
  ordersToday: number;
}

const BRANCHES: Branch[] = [
  { id: "1", name: "Mandaue City", slug: "mandaue", address: "A. Del Rosario Ave, Mandaue City", phone: "+63 32 344 0001", isActive: true, ordersToday: 8 },
  { id: "2", name: "Cebu IT Park", slug: "it-park", address: "Cebu IT Park, Apas, Cebu City", phone: "+63 32 344 0002", isActive: true, ordersToday: 6 },
  { id: "3", name: "Consolacion", slug: "consolacion", address: "National Highway, Consolacion", phone: "+63 32 344 0003", isActive: true, ordersToday: 5 },
  { id: "4", name: "Lapu-Lapu City", slug: "lapu-lapu", address: "M.L. Quezon Highway, Lapu-Lapu City", phone: "+63 32 344 0004", isActive: true, ordersToday: 5 },
];

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>(BRANCHES);

  function toggleActive(id: string) {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          + Add Branch
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map((branch) => (
          <div
            key={branch.id}
            className={`rounded-xl border bg-white p-6 shadow-sm ${
              branch.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{branch.name}</h3>
                <code className="text-xs text-gray-400">/{branch.slug}</code>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  branch.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {branch.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <p className="mb-1 text-sm text-gray-500">{branch.address}</p>
            <p className="mb-4 text-sm text-gray-500">{branch.phone}</p>

            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm">
                <span className="font-bold text-brand-700">{branch.ordersToday}</span>
                <span className="text-brand-500"> orders today</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Edit
              </button>
              <button
                onClick={() => toggleActive(branch.id)}
                className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                {branch.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
