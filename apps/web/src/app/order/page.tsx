"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "services" | "details" | "payment" | "confirmation";

const SERVICES = [
  { id: "1", name: "Wash & Fold", basePrice: 65, priceUnit: "kg" },
  { id: "2", name: "Wash & Iron", basePrice: 90, priceUnit: "kg" },
  { id: "3", name: "Dry Clean", basePrice: 150, priceUnit: "piece" },
  { id: "4", name: "Iron Only", basePrice: 40, priceUnit: "piece" },
];

interface SelectedItem {
  serviceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export default function OrderPage() {
  const [step, setStep] = useState<Step>("services");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [orderType, setOrderType] = useState<"walk_in" | "pickup" | "delivery">("walk_in");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitted(true);
    setStep("confirmation");
  }

  if (step === "confirmation") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Order Placed!</h1>
          <p className="mb-6 text-gray-500">
            We'll confirm your order shortly. Check your phone for updates.
          </p>
          <Link href="/" className="rounded-lg bg-brand-600 px-6 py-3 text-white hover:bg-brand-700">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6">
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Home</Link>
        </div>
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Book a Service</h1>

        {/* Steps indicator */}
        <div className="mb-8 flex gap-2">
          {(["services", "details", "payment"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-8 bg-gray-200" />}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  step === s ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm capitalize text-gray-600">{s}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Select services */}
        {step === "services" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Select Services</h2>
            <div className="grid gap-3">
              {SERVICES.map((s) => {
                const item = selectedItems.find((i) => i.serviceId === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
                    <div>
                      <div className="font-medium text-gray-900">{s.name}</div>
                      <div className="text-sm text-gray-500">₱{s.basePrice}/{s.priceUnit}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item ? (
                        <>
                          <button
                            onClick={() => removeItem(s.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                          >
                            –
                          </button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                        </>
                      ) : null}
                      <button
                        onClick={() => addItem(s)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedItems.length > 0 && (
              <div className="rounded-xl bg-brand-50 p-4">
                <div className="mb-2 font-medium text-brand-900">Selected</div>
                {selectedItems.map((i) => (
                  <div key={i.serviceId} className="flex justify-between text-sm text-brand-700">
                    <span>{i.name} × {i.quantity}</span>
                    <span>₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-2 border-t border-brand-200 pt-2 font-semibold text-brand-900">
                  Subtotal: ₱{subtotal.toFixed(2)}
                </div>
              </div>
            )}

            <button
              disabled={selectedItems.length === 0}
              onClick={() => setStep("details")}
              className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Order details */}
        {step === "details" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Order Details</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Order Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["walk_in", "pickup", "delivery"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`rounded-lg border py-2 text-sm font-medium capitalize ${
                      orderType === t
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {(orderType === "pickup" || orderType === "delivery") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your address"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("services")}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-600 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep("payment")}
                className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-700">Review & Payment</h2>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              {selectedItems.map((i) => (
                <div key={i.serviceId} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.name} × {i.quantity}</span>
                  <span>₱{(i.quantity * i.unitPrice).toFixed(2)}</span>
                </div>
              ))}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery fee</span>
                  <span>₱{deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold">
                <span>Total</span>
                <span className="text-brand-700">₱{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Pay with</h3>
              {["Cash on Pickup", "GCash", "Maya", "Credit/Debit Card"].map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-3">
                  <input type="radio" name="payment" value={m} className="text-brand-600" />
                  <span className="text-sm text-gray-700">{m}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("details")}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-600 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700"
              >
                Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
