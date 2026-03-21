import Link from "next/link";

// In production, fetch from /api/v1/services
const SERVICES = [
  { id: "1", name: "Wash & Fold", category: "wash", basePrice: "65.00", priceUnit: "kg", estimatedHours: 4, description: "Regular wash, dry, and fold." },
  { id: "2", name: "Wash & Iron", category: "wash", basePrice: "90.00", priceUnit: "kg", estimatedHours: 6, description: "Wash, dry, and iron." },
  { id: "3", name: "Dry Clean", category: "dry_clean", basePrice: "150.00", priceUnit: "piece", estimatedHours: 24, description: "Professional dry cleaning." },
  { id: "4", name: "Iron Only", category: "iron", basePrice: "40.00", priceUnit: "piece", estimatedHours: 2, description: "Ironing service only." },
  { id: "5", name: "Beddings & Linens", category: "wash", basePrice: "120.00", priceUnit: "piece", estimatedHours: 8, description: "Comforters, pillows, bedsheets." },
  { id: "6", name: "Sneaker Cleaning", category: "special", basePrice: "250.00", priceUnit: "pair", estimatedHours: 48, description: "Specialized shoe cleaning." },
  { id: "7", name: "Express Wash & Fold", category: "wash", basePrice: "90.00", priceUnit: "kg", estimatedHours: 6, description: "Same-day (drop off before 10am)." },
];

const CATEGORY_LABELS: Record<string, string> = {
  wash: "Wash",
  dry_clean: "Dry Clean",
  iron: "Iron",
  special: "Special",
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-600 hover:underline">
            ← Home
          </Link>
        </div>
        <h1 className="mb-3 text-4xl font-bold text-gray-900">Our Services</h1>
        <p className="mb-10 text-gray-500">
          Professional laundry services priced fairly. Minimum 3kg for wash services.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                  {CATEGORY_LABELS[service.category] ?? service.category}
                </span>
                <span className="text-xs text-gray-400">~{service.estimatedHours}h turnaround</span>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">{service.name}</h3>
              <p className="mb-4 text-sm text-gray-500">{service.description}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-brand-700">₱{service.basePrice}</span>
                  <span className="text-sm text-gray-400">/{service.priceUnit}</span>
                </div>
                <Link
                  href={`/order?serviceId=${service.id}`}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
