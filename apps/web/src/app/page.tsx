import Link from "next/link";

const FEATURES = [
  {
    icon: "👕",
    title: "Wash & Fold",
    description: "Professional washing, drying, and folding. Fresh clothes delivered to your door.",
    price: "Starting at ₱65/kg",
  },
  {
    icon: "👔",
    title: "Dry Clean",
    description: "Expert dry cleaning for your delicate and formal garments.",
    price: "Starting at ₱150/piece",
  },
  {
    icon: "🏍️",
    title: "Free Pickup & Delivery",
    description: "We pick up and deliver within 5km of our branches. Free on orders ₱500+.",
    price: "₱50 delivery fee",
  },
  {
    icon: "📅",
    title: "Monthly Subscriptions",
    description: "Subscribe and save up to 20% on regular laundry services.",
    price: "From ₱480/month",
  },
];

const BRANCHES = [
  { name: "Mandaue City", address: "A. Del Rosario Ave, Mandaue City" },
  { name: "Cebu IT Park", address: "Cebu IT Park, Apas, Cebu City" },
  { name: "Consolacion", address: "National Highway, Consolacion" },
  { name: "Lapu-Lapu City", address: "M.L. Quezon Highway, Lapu-Lapu City" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-700">Aunt Sally's</span>
            <span className="text-sm text-gray-500">Laundry</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/services" className="text-sm text-gray-600 hover:text-brand-700">
              Services
            </Link>
            <Link href="/branches" className="text-sm text-gray-600 hover:text-brand-700">
              Branches
            </Link>
            <Link
              href="/order"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-brand-100 px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-5xl font-bold text-brand-900">
            Laundry Done Right,
            <br />
            <span className="text-brand-600">Delivered to You.</span>
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            Professional laundry services across 4 branches in Cebu. Book online,
            we pick up, wash, and deliver — hassle-free.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/order"
              className="rounded-xl bg-brand-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:bg-brand-700"
            >
              Book a Pickup
            </Link>
            <Link
              href="/services"
              className="rounded-xl border border-brand-300 bg-white px-8 py-4 text-lg font-semibold text-brand-700 hover:bg-brand-50"
            >
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            What We Offer
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-3 text-4xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                <p className="mb-3 text-sm text-gray-500">{f.description}</p>
                <span className="text-xs font-medium text-brand-600">{f.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            Our Branches
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BRANCHES.map((b) => (
              <div
                key={b.name}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-2 font-semibold text-gray-900">{b.name}</div>
                <p className="text-sm text-gray-500">{b.address}</p>
                <div className="mt-3 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Open
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            Ready for fresh laundry?
          </h2>
          <p className="mb-8 text-gray-500">
            Book online in under 2 minutes. We handle the rest.
          </p>
          <Link
            href="/order"
            className="inline-block rounded-xl bg-brand-600 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:bg-brand-700"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Aunt Sally's Laundry. All rights reserved.</p>
          <p className="mt-1">Cebu, Philippines</p>
        </div>
      </footer>
    </main>
  );
}
