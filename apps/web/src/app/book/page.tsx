"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Step = "info" | "services" | "review";

const SERVICES = [
  { id: "1", name: "Wash & Fold",          basePrice: 65,  priceUnit: "kg" },
  { id: "2", name: "Wash & Iron",           basePrice: 90,  priceUnit: "kg" },
  { id: "3", name: "Dry Clean",             basePrice: 150, priceUnit: "piece" },
  { id: "4", name: "Iron Only",             basePrice: 40,  priceUnit: "piece" },
  { id: "5", name: "Beddings & Linens",     basePrice: 120, priceUnit: "piece" },
  { id: "6", name: "Sneaker Cleaning",      basePrice: 250, priceUnit: "pair" },
  { id: "7", name: "Express Wash & Fold",   basePrice: 90,  priceUnit: "kg" },
];

interface SelectedItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priceUnit: string;
}

const STEP_LABELS: Record<Step, string> = {
  info:     "Your Info",
  services: "Services",
  review:   "Review",
};
const STEPS: Step[] = ["info", "services", "review"];

export default function BookPage() {
  const [step, setStep] = useState<Step>("info");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // Step 1
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [address, setAddress] = useState("");

  // Step 2
  const [items, setItems] = useState<SelectedItem[]>([]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  function addItem(svc: (typeof SERVICES)[number]) {
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === svc.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: svc.basePrice, priceUnit: svc.priceUnit }];
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
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, address, items }),
    });
    const data = await res.json();
    setTrackingCode(data.trackingCode);
  }

  // ── Confirmation screen ────────────────────────────────────────────────
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
                  <div className={`h-px w-10 transition-colors ${
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
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maria Santos"
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                    Phone Number
                  </label>
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
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@example.com"
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Pickup Address
                </label>
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
                onClick={() => setStep("services")}
                className="w-full rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Service Selection ──────────────────────────── */}
          {step === "services" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {SERVICES.map((svc) => {
                  const item = items.find((i) => i.serviceId === svc.id);
                  return (
                    <div
                      key={svc.id}
                      className={`flex items-center justify-between border bg-white p-5 transition-colors ${
                        item ? "border-[#0ABAB5]/40" : "border-gray-100"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{svc.name}</div>
                        <div className="text-xs text-gray-400">₱{svc.basePrice}/{svc.priceUnit}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item && (
                          <>
                            <button
                              onClick={() => decreaseItem(svc.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                              aria-label="Remove"
                            >
                              –
                            </button>
                            <span className="w-5 text-center text-sm font-medium text-gray-900">
                              {item.quantity}
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => addItem(svc)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0ABAB5] text-white hover:bg-[#089e9a] transition-colors"
                          aria-label="Add"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {items.length > 0 && (
                <div className="border border-[#0ABAB5]/20 bg-[#0ABAB5]/5 p-5">
                  <div className="mb-3 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">
                    Selected
                  </div>
                  <div className="space-y-1">
                    {items.map((i) => (
                      <div key={i.serviceId} className="flex justify-between text-sm text-teal-700">
                        <span>{i.name} × {i.quantity}</span>
                        <span>₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-[#0ABAB5]/20 pt-3 flex justify-between font-medium text-gray-900 text-sm">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
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
                  disabled={items.length === 0}
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Confirm ───────────────────────────── */}
          {step === "review" && (
            <div className="space-y-6">
              {/* Customer details */}
              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">
                  Your Information
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Name</dt>
                    <dd className="text-gray-900">{name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Phone</dt>
                    <dd className="text-gray-900">{phone}</dd>
                  </div>
                  {email && (
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Email</dt>
                      <dd className="text-gray-900">{email}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Address</dt>
                    <dd className="text-right text-gray-900 max-w-[60%]">{address}</dd>
                  </div>
                </dl>
              </div>

              {/* Order summary */}
              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">
                  Order Summary
                </div>
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.serviceId} className="flex justify-between text-sm">
                      <span className="text-gray-500">{i.name} × {i.quantity} {i.priceUnit}</span>
                      <span className="text-gray-900">₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-[#0ABAB5]">₱{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-gray-400">
                By confirming, you agree to our collection and processing of your information to complete this booking. Final price may vary based on actual weight/quantity.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("services")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
