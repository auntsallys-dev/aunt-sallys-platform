"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const API = "https://aunt-sallys-pos.onrender.com";

type Step = "info" | "branch" | "services" | "review";

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: string;
  priceUnit: string;
  description: string | null;
}

interface SelectedItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceUnit: string;
}

const STEP_LABELS: Record<Step, string> = {
  info:     "Your Info",
  branch:   "Branch",
  services: "Services",
  review:   "Review",
};
const STEPS: Step[] = ["info", "branch", "services", "review"];

const CATEGORY_LABELS: Record<string, string> = {
  wash_dry_fold:  "Wash, Dry & Fold",
  wash_dry_press: "Wash, Dry & Press",
  dry_only:       "Dry Only",
  heavy_wash:     "Heavy Wash",
  comforter:      "Comforter",
  dry_clean:      "Dry Clean",
  addon:          "Add-ons",
  logistics:      "Logistics",
};

const CATEGORY_ORDER = [
  "wash_dry_fold",
  "wash_dry_press",
  "dry_only",
  "heavy_wash",
  "comforter",
  "dry_clean",
  "addon",
  "logistics",
];

function groupServices(list: Service[]) {
  const map: Record<string, Service[]> = {};
  for (const svc of list) {
    if (!map[svc.category]) map[svc.category] = [];
    map[svc.category].push(svc);
  }
  return CATEGORY_ORDER.filter((cat) => map[cat]?.length).map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat] ?? cat,
    services: map[cat],
  }));
}

export default function BookPage() {
  const [step, setStep] = useState<Step>("info");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remote data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ReturnType<typeof groupServices>>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Step 1 — info
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — branch
  const [branchId, setBranchId] = useState("");

  // Step 3 — services
  const [items, setItems] = useState<SelectedItem[]>([]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  useEffect(() => {
    async function load() {
      try {
        const [bRes, sRes] = await Promise.all([
          fetch(`${API}/api/v1/public/branches`),
          fetch(`${API}/api/v1/public/services`),
        ]);
        const bData = await bRes.json();
        const sData = await sRes.json();
        if (bData.success) setBranches(bData.data);
        if (sData.success) setServiceGroups(groupServices(sData.data));
      } catch {
        // fail silently — fallback handled via error state
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  function addItem(svc: Service) {
    const price = parseFloat(svc.basePrice);
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === svc.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: price, priceUnit: svc.priceUnit }];
    });
  }

  function decreaseItem(serviceId: string) {
    setItems((prev) =>
      prev
        .map((i) => i.serviceId === serviceId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0)
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/v1/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          address,
          branchId,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Booking failed. Please try again.");
        return;
      }
      setTrackingCode(data.data.trackingCode);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedBranch = branches.find((b) => b.id === branchId);

  // ── Confirmation screen ──────────────────────────────────────────────
  if (trackingCode) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#fafafa] px-4">
          <div className="max-w-md w-full text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0ABAB5]/10">
              <svg className="h-8 w-8 text-[#0ABAB5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="font-display mb-2 text-4xl font-light text-gray-900">Booking Confirmed</h1>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              Thank you, {name}. We've received your booking and will be in touch shortly.
            </p>
            <div className="mb-8 border border-[#0ABAB5]/20 bg-[#0ABAB5]/5 px-6 py-5">
              <p className="mb-1 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">
                Tracking Code
              </p>
              <p className="font-display text-3xl font-light tracking-widest text-gray-900">
                {trackingCode}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Link
                href={`/track?code=${trackingCode}`}
                className="rounded-sm bg-[#0ABAB5] px-8 py-3 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors"
              >
                Track Order
              </Link>
              <Link
                href="/"
                className="rounded-sm border border-gray-200 px-8 py-3 text-sm font-medium tracking-wide text-gray-600 hover:border-[#0ABAB5]/40 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-56px)] bg-[#fafafa]">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <Link href="/" className="text-xs tracking-widest text-[#0ABAB5] hover:text-[#089e9a] uppercase transition-colors">
            ← Home
          </Link>

          <h1 className="font-display mt-6 mb-10 text-4xl font-light text-gray-900">
            Book a Pickup
          </h1>

          {/* Step indicator */}
          <div className="mb-10 flex items-center">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div className={`h-px w-8 transition-colors ${
                    STEPS.indexOf(step) >= i ? "bg-[#0ABAB5]" : "bg-gray-200"
                  }`} />
                )}
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    step === s
                      ? "bg-[#0ABAB5] text-white"
                      : STEPS.indexOf(step) > i
                        ? "bg-[#0ABAB5]/20 text-[#0ABAB5]"
                        : "bg-gray-100 text-gray-400"
                  }`}>
                    {STEPS.indexOf(step) > i ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs tracking-wide ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Step 1: Customer Info ──────────────────────────────── */}
          {step === "info" && (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maria Santos"
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Email Address <span className="normal-case text-gray-300">(optional)</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@example.com"
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Pickup Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House / unit number, street, barangay, city"
                  rows={3}
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors resize-none"
                />
              </div>
              <button
                disabled={!name.trim() || !phone.trim() || !address.trim()}
                onClick={() => setStep("branch")}
                className="w-full rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Branch Selection ───────────────────────────── */}
          {step === "branch" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select your nearest Aunt Sally&apos;s branch.</p>
              {loadingData ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading branches…</div>
              ) : (
                <div className="space-y-2">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBranchId(b.id)}
                      className={`w-full text-left border p-5 transition-colors ${
                        branchId === b.id ? "border-[#0ABAB5] bg-[#0ABAB5]/5" : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{b.name}</div>
                          {b.address && <div className="mt-0.5 text-xs text-gray-400">{b.address}</div>}
                        </div>
                        {branchId === b.id && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0ABAB5]">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("info")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  disabled={!branchId}
                  onClick={() => setStep("services")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Service Selection ──────────────────────────── */}
          {step === "services" && (
            <div className="space-y-4">
              {loadingData ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading services…</div>
              ) : (
                <div className="space-y-6">
                  {serviceGroups.map((group) => (
                    <div key={group.key}>
                      <div className="mb-2 text-xs font-medium tracking-widest text-gray-400 uppercase">
                        {group.label}
                      </div>
                      <div className="space-y-2">
                        {group.services.map((svc) => {
                          const item = items.find((i) => i.serviceId === svc.id);
                          const price = parseFloat(svc.basePrice);
                          return (
                            <div
                              key={svc.id}
                              className={`flex items-center justify-between border bg-white p-4 transition-colors ${
                                item ? "border-[#0ABAB5]/40" : "border-gray-100"
                              }`}
                            >
                              <div>
                                <div className="text-sm font-medium text-gray-900">{svc.name}</div>
                                <div className="text-xs text-gray-400">
                                  ₱{price.toLocaleString()}/{svc.priceUnit}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {item && (
                                  <>
                                    <button
                                      onClick={() => decreaseItem(svc.id)}
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                                    >–</button>
                                    <span className="w-5 text-center text-sm font-medium text-gray-900">
                                      {item.quantity}
                                    </span>
                                  </>
                                )}
                                <button
                                  onClick={() => addItem(svc)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0ABAB5] text-white hover:bg-[#089e9a] transition-colors"
                                >+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {items.length > 0 && (
                <div className="border border-[#0ABAB5]/20 bg-[#0ABAB5]/5 p-5">
                  <div className="mb-3 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">Selected</div>
                  <div className="space-y-1">
                    {items.map((i) => (
                      <div key={i.serviceId} className="flex justify-between text-sm text-teal-700">
                        <span>{i.name} × {i.quantity}</span>
                        <span>₱{(i.quantity * i.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#0ABAB5]/20 pt-3 flex justify-between font-medium text-gray-900 text-sm">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("branch")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >← Back</button>
                <button
                  disabled={items.length === 0}
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
                >Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Confirm ───────────────────────────── */}
          {step === "review" && (
            <div className="space-y-6">
              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">Your Information</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-400">Name</dt><dd className="text-gray-900">{name}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Phone</dt><dd className="text-gray-900">{phone}</dd></div>
                  {email && <div className="flex justify-between"><dt className="text-gray-400">Email</dt><dd className="text-gray-900">{email}</dd></div>}
                  <div className="flex justify-between"><dt className="text-gray-400">Address</dt><dd className="text-right text-gray-900 max-w-[60%]">{address}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Branch</dt><dd className="text-gray-900">{selectedBranch?.name}</dd></div>
                </dl>
              </div>

              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">Order Summary</div>
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.serviceId} className="flex justify-between text-sm">
                      <span className="text-gray-500">{i.name} × {i.quantity}</span>
                      <span className="text-gray-900">₱{(i.quantity * i.unitPrice).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
                    <span className="text-gray-900">Total</span>
                    <span style={{ color: "#0ABAB5" }}>₱{subtotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <p className="text-xs leading-relaxed text-gray-400">
                By confirming, you agree to our collection and processing of your information to complete this booking. Final price may vary based on actual weight/quantity.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("services")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >← Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-60 transition-colors"
                >
                  {submitting ? "Submitting…" : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
