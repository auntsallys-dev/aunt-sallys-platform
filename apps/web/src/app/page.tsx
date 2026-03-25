import Link from "next/link";
import Navbar from "@/components/Navbar";

const SERVICES = [
  {
    category: "Wash Dry Fold",
    items: [
      { name: "Regular Bag (1–5kg)", price: "₱400" },
      { name: "Large Bag (6kg+)", price: "₱500" },
    ],
  },
  {
    category: "Wash Dry Press",
    items: [
      { name: "Regular (12 pcs ironed)", price: "₱1,120" },
      { name: "Large (24 pcs ironed)", price: "₱1,680" },
    ],
  },
  {
    category: "Dry Only",
    items: [
      { name: "1–5kg", price: "₱240" },
      { name: "6–10kg", price: "₱340" },
    ],
  },
  {
    category: "Heavy Wash",
    items: [
      { name: "Sheets, Blankets & Towels (up to 8kg)", price: "₱780" },
      { name: "Seat Covers & Curtains (up to 8kg)", price: "₱890" },
    ],
  },
  {
    category: "Comforter",
    items: [
      { name: "Single / Twin", price: "₱500" },
      { name: "Double / Queen", price: "₱560" },
      { name: "King", price: "₱670" },
    ],
  },
  {
    category: "Dry Clean",
    items: [
      { name: "Barong (Adults)", price: "₱670" },
      { name: "Coat / Jacket (Adults)", price: "₱560" },
      { name: "Dress (Adults)", price: "₱670" },
      { name: "Wedding Gown", price: "₱2,800+" },
    ],
  },
];

const BRANCHES = [
  { name: "Arton Rockwell", area: "Rockwell, Makati" },
  { name: "Ayala 30th", area: "30th Street, BGC, Taguig" },
  { name: "Tiendesitas", area: "Pasig" },
  { name: "Xavierville", area: "Katipunan, Quezon City" },
];

const PLANS = [
  { name: "Starter", price: "₱480", period: "/month", perks: ["Up to 5kg/week", "Wash & fold only", "Free pickup & delivery"] },
  { name: "Regular", price: "₱880", period: "/month", perks: ["Up to 10kg/week", "Wash, dry & press", "Free pickup & delivery", "Priority scheduling"] },
  { name: "Family", price: "₱1,500", period: "/month", perks: ["Up to 20kg/week", "All services included", "Free pickup & delivery", "Priority scheduling", "Dedicated branch contact"] },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="px-4 py-24 text-center max-w-4xl mx-auto">
        <p className="text-xs tracking-[0.3em] text-brand-500 uppercase mb-6">Premium Laundry · Metro Manila</p>
        <h1 className="font-serif text-6xl md:text-7xl font-light text-gray-900 leading-tight mb-6">
          We take the laundry,<br />
          <em className="text-brand-500 not-italic">You take the time.</em>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Professional laundry services across 4 branches in Metro Manila. Book online — we pick up, wash, and deliver.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/book" className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 text-sm tracking-widest uppercase transition-colors">
            Book a Pickup
          </Link>
          <Link href="/services" className="border border-gray-300 hover:border-brand-500 text-gray-700 hover:text-brand-500 px-8 py-3.5 text-sm tracking-widest uppercase transition-colors">
            View Services
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-4"><div className="border-t border-gray-100" /></div>

      {/* Services */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] text-brand-500 uppercase mb-3">What We Offer</p>
          <h2 className="font-serif text-4xl font-light text-gray-900">Our Services</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((s) => (
            <div key={s.category} className="border border-gray-100 p-6 hover:border-brand-300 transition-colors">
              <div className="w-6 h-px bg-brand-500 mb-4" />
              <h3 className="font-serif text-xl font-medium text-gray-900 mb-3">{s.category}</h3>
              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item.name} className="flex justify-between text-sm text-gray-600">
                    <span>{item.name}</span>
                    <span className="text-brand-600 font-medium ml-4 shrink-0">{item.price}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/services" className="text-sm text-brand-500 hover:text-brand-700 tracking-widest uppercase border-b border-brand-300 pb-0.5 transition-colors">
            See full price list →
          </Link>
        </div>
      </section>

      {/* Add-ons strip */}
      <section className="bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-x-10 gap-y-2 justify-center text-sm text-gray-500">
          <span>Special Detergent <span className="text-brand-500 font-medium">₱50</span></span>
          <span>Fabric Conditioner <span className="text-brand-500 font-medium">₱50</span></span>
          <span>Pick-up & Delivery <span className="text-brand-500 font-medium">₱180</span></span>
          <span>Rush Next Day <span className="text-brand-500 font-medium">₱300</span></span>
          <span>Rush Same Day <span className="text-brand-500 font-medium">₱500</span></span>
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] text-brand-500 uppercase mb-3">Where to Find Us</p>
          <h2 className="font-serif text-4xl font-light text-gray-900">Our Branches</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BRANCHES.map((b) => (
            <div key={b.name} className="border border-gray-100 p-6 hover:border-brand-300 transition-colors">
              <div className="w-6 h-px bg-brand-500 mb-4" />
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-1">{b.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{b.area}</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                Open
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] text-brand-500 uppercase mb-3">Save More</p>
            <h2 className="font-serif text-4xl font-light text-gray-900">Monthly Plans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={`p-8 border ${i === 1 ? "border-brand-400 bg-white shadow-sm" : "border-gray-100 bg-white"}`}>
                {i === 1 && <p className="text-xs text-brand-500 tracking-widest uppercase mb-3">Most Popular</p>}
                <h3 className="font-serif text-2xl font-light text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-3xl font-medium text-brand-500">{plan.price}</span>
                  <span className="text-sm text-gray-400 pb-1">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-8">
                  {plan.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-brand-500">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href="/book" className={`block text-center py-2.5 text-sm tracking-widest uppercase transition-colors ${i === 1 ? "bg-brand-500 text-white hover:bg-brand-600" : "border border-gray-300 text-gray-700 hover:border-brand-500 hover:text-brand-500"}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0ABAB5] py-20 px-4 text-center">
        <p className="text-xs tracking-[0.3em] text-white/70 uppercase mb-4">Ready?</p>
        <h2 className="font-serif text-4xl font-light text-white mb-4">Fresh laundry, delivered.</h2>
        <p className="text-white/80 mb-8">Book in under 2 minutes. We handle everything else.</p>
        <Link href="/book" className="bg-white hover:bg-white/90 text-[#0ABAB5] font-medium px-8 py-3.5 text-sm tracking-widest uppercase transition-colors">
          Book a Pickup
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#0ABAB5] border-t border-white/20 py-8 text-center text-xs text-white/80 tracking-wide">
        © 2026 Aunt Sally&apos;s Laundry. All rights reserved. · Metro Manila, Philippines
      </footer>
    </div>
  );
}
