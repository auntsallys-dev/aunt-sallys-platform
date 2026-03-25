"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Step = "services" | "details" | "payment" | "confirmation";

const SERVICES = [
  { id: "1", name: "Wash & Fold",  basePrice: 65,  priceUnit: "kg" },
  { id: "2", name: "Wash & Iron",  basePrice: 90,  priceUnit: "kg" },
  { id: "3", name: "Dry Clean",    basePrice: 150, priceUnit: "piece" },
  { id: "4", name: "Iron Only",    basePrice: 40,  priceUnit: "piece" },
];

interface SelectedItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

const STEP_LABELS: Record<string, string> = {
  services: "Services",
  details:  "Details",
  payment:  "Payment",
};

export default function OrderPage() {
  const [step, setStep] = useState<Step>("services");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [orderType, setOrderType] = useState<"walk_in" | "pickup" | "delivery">("walk_in");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const subtotal = selectedItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const deliveryFee = orderType === "delivery" ? 50 : 0;
  const total = subtotal + deliveryFee;

  function addItem(service: (typeof SERVICES)[number]) {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.serviceId === service.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === service.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { serviceId: service.id, name: service.name, quantity: 1, unitPrice: service.basePrice }];
    });
  }

  function removeItem(serviceId: string) {
    setSelectedItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }

  function handleSubmit() {
    // In production: POST /api/v1/orders
    setStep("confirmation");
  }

  if (step === "confirmation") {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#fafafa] px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <svg className="h-8 w-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="font-display mb-2 text-4xl font-light text-gray-900">Order Placed</h1>
            <p className="mb-8 text-sm leading-relaxed text-gray-400">
              We'll confirm your order shortly. Check your phone for updates.
            </p>
            <Link
              href="/"
              className="inline-block rounded-sm bg-brand-500 px-8 py-3 text-sm font-medium tracking-wide text-white hover:bg-brand-600 transition-colors"
            >
              Back to Home
            </Link>
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
          {/* Back link */}
          <Link href="/" className="text-xs tracking-widest text-brand-500 hover:text-brand-700 uppercase transition-colors">
            ← Home
          </Link>

          <h1 className="font-display mt-6 mb-10 text-4xl font-light text-gray-900">
            Book a Service
          </h1>

          {/* Step indicator */}
          <div className="mb-10 flex items-center gap-0">
            {(["services", "details", "payment"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div className={`h-px w-10 ${
                    ["details","payment"].indexOf(step) >= i ? "bg-brand-400" : "bg-gray-200"
                  }`} />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      step === s
                        ? "bg-brand-500 text-white"
                        : ["details","payment"].indexOf(step) > ["services","details","payment"].indexOf(s)
                          ? "bg-brand-100 text-brand-600"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-xs tracking-wide ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Step 1: Services ────────────────────────────────── */}
          {step === "services" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {SERVICES.map((s) => {
                  const item = selectedItems.find((i) => i.serviceId === s.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between border bg-white p-5 transition-colors ${
                        item ? "border-brand-200" : "border-gray-100"
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-400">₱{s.basePrice}/{s.priceUnit}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {item && (
                          <>
                            <button
                              onClick={() => removeItem(s.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                              aria-label="Remove"
                            >
                              –
                            </button>
                            <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                          </>
                        )}
                        <button
                          onClick={() => addItem(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                          aria-label="Add"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedItems.length > 0 && (
                <div className="border border-brand-100 bg-brand-50 p-5">
                  <div className="mb-3 text-xs font-medium tracking-widest text-brand-600 uppercase">
                    Selected
                  </div>
                  <div className="space-y-1">
                    {selectedItems.map((i) => (
                      <div key={i.serviceId} className="flex justify-between text-sm text-brand-700">
                        <span>{i.name} × {i.quantity}</span>
                        <span>₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-brand-200 pt-3 flex justify-between font-medium text-brand-900 text-sm">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                disabled={selectedItems.length === 0}
                onClick={() => setStep("details")}
                className="w-full rounded-sm bg-brand-500 py-4 text-sm font-medium tracking-wide text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Details ─────────────────────────────────── */}
          {step === "details" && (
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Order Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["walk_in", "pickup", "delivery"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`border py-3 text-xs font-medium tracking-wide capitalize transition-colors ${
                        orderType === t
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {t.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {(orderType === "pickup" || orderType === "delivery") && (
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Your address"
                    className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("services")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep("payment")}
                  className="flex-1 rounded-sm bg-brand-500 py-4 text-sm font-medium tracking-wide text-white hover:bg-brand-600 transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Payment ─────────────────────────────────── */}
          {step === "payment" && (
            <div className="space-y-6">
              {/* Order summary */}
              <div className="border border-gray-100 bg-white p-5 space-y-2">
                <div className="mb-3 text-xs font-medium tracking-widest text-gray-400 uppercase">
                  Order Summary
                </div>
                {selectedItems.map((i) => (
                  <div key={i.serviceId} className="flex justify-between text-sm">
                    <span className="text-gray-500">{i.name} × {i.quantity}</span>
                    <span className="text-gray-900">₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Delivery fee</span>
                    <span>₱{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
                  <span className="text-gray-900">Total</span>
                  <span className="text-brand-600">₱{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="border border-gray-100 bg-white p-5 space-y-3">
                <div className="mb-1 text-xs font-medium tracking-widest text-gray-400 uppercase">
                  Payment Method
                </div>
                {["Cash on Pickup", "GCash", "Maya", "Credit / Debit Card"].map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value={m}
                      className="accent-brand-500"
                    />
                    <span className="text-sm text-gray-700">{m}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("details")}
                  className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 rounded-sm bg-brand-500 py-4 text-sm font-medium tracking-wide text-white hover:bg-brand-600 transition-colors"
                >
                  Place Order
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
