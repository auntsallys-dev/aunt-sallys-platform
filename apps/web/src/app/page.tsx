import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";

const TEAL = "#0ABAB5";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.auntsallyslaundry.com";

interface BranchData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  operatingHours: string | null;
}

async function fetchBranches(): Promise<BranchData[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/branches`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

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
  {
    name: "Starter",
    price: "₱480",
    period: "/month",
    popular: false,
    perks: ["Up to 5kg/week", "Wash & fold only", "Free pickup & delivery"],
  },
  {
    name: "Regular",
    price: "₱880",
    period: "/month",
    popular: true,
    perks: ["Up to 10kg/week", "Wash, dry & press", "Free pickup & delivery", "Priority scheduling"],
  },
  {
    name: "Family",
    price: "₱1,500",
    period: "/month",
    popular: false,
    perks: ["Up to 20kg/week", "All services included", "Free pickup & delivery", "Priority scheduling", "Dedicated branch contact"],
  },
];

export default async function HomePage() {
  const liveBranches = await fetchBranches();

  return (
    <div className="bg-white font-sans">
      <Navbar />

      {/* Hero */}
      <section className="px-4 pt-12 pb-20 text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-10">
          <Image
            src="/logo-cropped.png"
            alt="Aunt Sally's Laundry"
            width={420}
            height={192}
            className="object-contain"
            priority
          />
        </div>
        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: TEAL }}>
          Premium Laundry · Metro Manila
        </p>
        <h1 className="font-serif text-6xl md:text-7xl font-light text-gray-900 leading-tight mb-6">
          We take the laundry,
          <br />
          <em className="not-italic" style={{ color: TEAL }}>You take the time.</em>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Professional laundry services across 4 branches in Metro Manila.
          Book online — we pick up, wash, and deliver.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/book"
            className="px-8 py-3.5 text-sm tracking-widest uppercase text-white transition-colors"
            style={{ backgroundColor: TEAL }}
          >
            Book a Pickup
          </Link>
          <Link
            href="/services"
            className="border border-gray-300 text-gray-700 px-8 py-3.5 text-sm tracking-widest uppercase transition-colors hover:border-[#0ABAB5] hover:text-[#0ABAB5]"
          >
            View Services
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="border-t border-gray-100" />
      </div>

      {/* Services */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: TEAL }}>
            What We Offer
          </p>
          <h2 className="font-serif text-4xl font-light text-gray-900">Our Services</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((s) => (
            <div key={s.category} className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
              <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
              <h3 className="font-serif text-xl font-medium text-gray-900 mb-3">{s.category}</h3>
              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item.name} className="flex justify-between text-sm text-gray-600">
                    <span>{item.name}</span>
                    <span className="ml-4 shrink-0 font-medium" style={{ color: TEAL }}>
                      {item.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/services"
            className="text-sm tracking-widest uppercase border-b pb-0.5 transition-colors"
            style={{ color: TEAL, borderColor: TEAL }}
          >
            See full price list →
          </Link>
        </div>
      </section>

      {/* Add-ons strip */}
      <section className="bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-x-10 gap-y-2 justify-center text-sm text-gray-500">
          {[
            ["Special Detergent", "₱50"],
            ["Fabric Conditioner", "₱50"],
            ["Pick-up & Delivery", "₱180"],
            ["Rush Next Day", "₱300"],
            ["Rush Same Day", "₱500"],
          ].map(([label, price]) => (
            <span key={label}>
              {label} <span className="font-medium" style={{ color: TEAL }}>{price}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: TEAL }}>
            Where to Find Us
          </p>
          <h2 className="font-serif text-4xl font-light text-gray-900">Our Branches</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(liveBranches.length > 0 ? liveBranches : BRANCHES.map((b) => ({ id: b.name, name: b.name, slug: "", address: b.area, phone: null, secondaryPhone: null, operatingHours: null }))).map((b) => (
            <div key={b.id} className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
              <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-1">{b.name.replace("Aunt Sally's Laundry — ", "")}</h3>
              {b.address && <p className="text-sm text-gray-500 mb-3">{b.address}</p>}
              {b.operatingHours ? (
                <div className="space-y-0.5">
                  {b.operatingHours.split(" | ").map((line: string, i: number) => (
                    <p key={i} className="text-xs" style={{ color: i === 0 ? TEAL : "#6b7280" }}>{line}</p>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: TEAL }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: TEAL }} />
                  Open
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Subscription Plans — temporarily hidden until finalized */}

      {/* Contact Us */}
      <section id="contact" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: TEAL }}>Get In Touch</p>
            <h2 className="font-serif text-4xl font-light text-gray-900">Contact Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Email */}
            <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
              <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-1">Email Us</h3>
              <p className="text-sm text-gray-500 mb-3">For inquiries, partnerships, and general concerns</p>
              <a href="mailto:admin@auntsallyslaundry.com" className="text-sm font-medium hover:underline" style={{ color: TEAL }}>
                admin@auntsallyslaundry.com
              </a>
            </div>
            {/* Social / General */}
            <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
              <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-1">Follow Us</h3>
              <p className="text-sm text-gray-500 mb-3">Stay updated on promos, new services, and branch news</p>
              <a href="https://facebook.com/auntsallyslaundry" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: TEAL }}>
                facebook.com/auntsallyslaundry
              </a>
            </div>
          </div>

          {/* Branch contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {liveBranches.length > 0 ? liveBranches.map((branch) => (
              <div key={branch.id} className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
                <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
                <h3 className="font-serif text-base font-medium text-gray-900 mb-1">{branch.name.replace("Aunt Sally's Laundry — ", "")}</h3>
                {branch.address && <p className="text-xs text-gray-500 mb-3">{branch.address}</p>}
                {branch.phone && (
                  <a href={`tel:${branch.phone.replace(/\D/g, "")}`} className="text-sm font-medium hover:underline block" style={{ color: TEAL }}>
                    {branch.phone}
                  </a>
                )}
                {branch.secondaryPhone && (
                  <a href={`tel:${branch.secondaryPhone.replace(/\D/g, "")}`} className="text-sm font-medium hover:underline block mt-1" style={{ color: TEAL }}>
                    {branch.secondaryPhone}
                  </a>
                )}
                {branch.operatingHours && (
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    {branch.operatingHours.split(" | ").map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </p>
                )}
              </div>
            )) : (
              <>
                <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
                  <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
                  <h3 className="font-serif text-base font-medium text-gray-900 mb-1">Arton West Residence</h3>
                  <p className="text-xs text-gray-500 mb-3">GF-RS-102 The Arton West Tower, Aurora Blvd, Loyola Heights, Quezon City</p>
                  <a href="tel:09173072559" className="text-sm font-medium hover:underline block" style={{ color: TEAL }}>0917 307 2559</a>
                </div>
                <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
                  <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
                  <h3 className="font-serif text-base font-medium text-gray-900 mb-1">Ayala Mall The 30th</h3>
                  <p className="text-xs text-gray-500 mb-3">LGF Ayala Malls 30th, 30 Meralco Ave, Pasig City</p>
                  <a href="tel:09175272559" className="text-sm font-medium hover:underline block" style={{ color: TEAL }}>0917 527 2559</a>
                </div>
                <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
                  <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
                  <h3 className="font-serif text-base font-medium text-gray-900 mb-1">Tiendesitas</h3>
                  <p className="text-xs text-gray-500 mb-3">PA-01 Tiendesitas En Frontera Verde, Ortigas East, Pasig City</p>
                  <a href="tel:09306975505" className="text-sm font-medium hover:underline block" style={{ color: TEAL }}>0930 697 5505</a>
                  <a href="tel:83627678" className="text-sm font-medium hover:underline block mt-1" style={{ color: TEAL }}>8362-7678</a>
                </div>
                <div className="border border-gray-100 p-6 hover:border-[#47d8d5] transition-colors">
                  <div className="w-6 h-px mb-4" style={{ backgroundColor: TEAL }} />
                  <h3 className="font-serif text-base font-medium text-gray-900 mb-1">Xavierville</h3>
                  <p className="text-xs text-gray-500 mb-3">45 Xavierville Ave, Loyola Heights, Quezon City</p>
                  <a href="tel:09947095448" className="text-sm font-medium hover:underline block" style={{ color: TEAL }}>0994 709 5448</a>
                  <a href="tel:87086560" className="text-sm font-medium hover:underline block mt-1" style={{ color: TEAL }}>8708-6560</a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center" style={{ backgroundColor: TEAL }}>
        <p className="text-xs tracking-[0.3em] uppercase mb-4 text-white/70">Ready?</p>
        <h2 className="font-serif text-4xl font-light text-white mb-4">Fresh laundry, delivered.</h2>
        <p className="text-white/80 mb-8">Book in under 2 minutes. We handle everything else.</p>
        <Link
          href="/book"
          className="bg-white font-medium px-8 py-3.5 text-sm tracking-widest uppercase transition-colors hover:bg-white/90"
          style={{ color: TEAL }}
        >
          Book a Pickup
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="py-8 text-center text-xs tracking-wide border-t border-white/20 text-white/80"
        style={{ backgroundColor: TEAL }}
      >
        © 2026 Aunt Sally&apos;s Laundry. All rights reserved. · Metro Manila, Philippines
      </footer>
    </div>
  );
}
