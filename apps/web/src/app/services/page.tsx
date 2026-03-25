import Link from "next/link";
import Navbar from "@/components/Navbar";

const SERVICES = [
  { id: "1", name: "Wash & Fold",        category: "Wash",      basePrice: "65",  priceUnit: "kg",    estimatedHours: 4,  description: "Regular wash, dry, and fold. Returned neatly stacked and fresh." },
  { id: "2", name: "Wash & Iron",        category: "Wash",      basePrice: "90",  priceUnit: "kg",    estimatedHours: 6,  description: "Wash, dry, and pressed to perfection." },
  { id: "3", name: "Dry Clean",          category: "Dry Clean", basePrice: "150", priceUnit: "piece", estimatedHours: 24, description: "Professional dry cleaning for delicate and formal garments." },
  { id: "4", name: "Iron Only",          category: "Iron",      basePrice: "40",  priceUnit: "piece", estimatedHours: 2,  description: "Crisp, wrinkle-free results on any garment." },
  { id: "5", name: "Beddings & Linens",  category: "Wash",      basePrice: "120", priceUnit: "piece", estimatedHours: 8,  description: "Comforters, pillows, and bedsheets handled with care." },
  { id: "6", name: "Sneaker Cleaning",   category: "Special",   basePrice: "250", priceUnit: "pair",  estimatedHours: 48, description: "Specialized deep-clean for your favourite kicks." },
  { id: "7", name: "Express Wash & Fold",category: "Wash",      basePrice: "90",  priceUnit: "kg",    estimatedHours: 6,  description: "Same-day turnaround. Drop off before 10 am." },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-20">
        {/* Header */}
        <div className="mb-16">
          <Link href="/" className="text-xs tracking-widest text-brand-500 hover:text-brand-700 uppercase transition-colors">
            ← Home
          </Link>
          <h1 className="font-display mt-6 text-5xl font-light text-gray-900">
            Our Services
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            Professionally priced. Minimum 3 kg for wash services.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="group border border-gray-100 p-6 hover:border-brand-200 transition-colors"
            >
              <div className="mb-5 flex items-start justify-between">
                <span className="text-xs font-medium tracking-widest text-brand-500 uppercase">
                  {service.category}
                </span>
                <span className="text-xs text-gray-300">~{service.estimatedHours}h</span>
              </div>

              <h3 className="font-display mb-2 text-xl font-medium text-gray-900">
                {service.name}
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-gray-400">
                {service.description}
              </p>

              <div className="flex items-end justify-between">
                <div>
                  <span className="font-display text-3xl font-light text-gray-900">
                    ₱{service.basePrice}
                  </span>
                  <span className="ml-1 text-xs text-gray-400">/{service.priceUnit}</span>
                </div>
                <Link
                  href={`/order?serviceId=${service.id}`}
                  className="rounded-sm bg-brand-500 px-4 py-2 text-xs font-medium tracking-wide text-white hover:bg-brand-600 transition-colors"
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
