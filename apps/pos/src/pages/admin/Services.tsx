import { useState } from "react";

interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  priceUnit: string;
  estimatedHours: number;
  isActive: boolean;
}

const SERVICES: Service[] = [
  { id: "1", name: "Wash & Fold", category: "wash", basePrice: 65, priceUnit: "kg", estimatedHours: 4, isActive: true },
  { id: "2", name: "Wash & Iron", category: "wash", basePrice: 90, priceUnit: "kg", estimatedHours: 6, isActive: true },
  { id: "3", name: "Dry Clean", category: "dry_clean", basePrice: 150, priceUnit: "piece", estimatedHours: 24, isActive: true },
  { id: "4", name: "Iron Only", category: "iron", basePrice: 40, priceUnit: "piece", estimatedHours: 2, isActive: true },
  { id: "5", name: "Beddings & Linens", category: "wash", basePrice: 120, priceUnit: "piece", estimatedHours: 8, isActive: true },
  { id: "6", name: "Sneaker Cleaning", category: "special", basePrice: 250, priceUnit: "pair", estimatedHours: 48, isActive: true },
  { id: "7", name: "Express Wash & Fold", category: "wash", basePrice: 90, priceUnit: "kg", estimatedHours: 6, isActive: true },
];

const CATEGORY_COLORS: Record<string, string> = {
  wash: "bg-blue-100 text-blue-700",
  dry_clean: "bg-purple-100 text-purple-700",
  iron: "bg-orange-100 text-orange-700",
  special: "bg-pink-100 text-pink-700",
};

export function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>(SERVICES);

  function toggleActive(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          + Add Service
        </button>
      </div>

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
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{service.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[service.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {service.category.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  ₱{service.basePrice}/{service.priceUnit}
                </td>
                <td className="px-4 py-3 text-gray-500">~{service.estimatedHours}h</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {service.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs text-brand-600 hover:underline">Edit</button>
                    <button
                      onClick={() => toggleActive(service.id)}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      {service.isActive ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
