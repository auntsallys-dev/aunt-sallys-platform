"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// ── Map pin component (Leaflet) ────────────────────────────────────────────
interface LatLng { lat: number; lng: number; }

function MapPinModal({
  initialLatLng,
  onConfirm,
  onClose,
}: {
  initialLatLng: LatLng;
  onConfirm: (ll: LatLng) => void;
  onClose: () => void;
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [pinLatLng, setPinLatLng] = useState<LatLng>(initialLatLng);

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    import("leaflet").then((m) => {
      const L = m.default ?? m;
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(mapDivRef.current!, { center: [initialLatLng.lat, initialLatLng.lng], zoom: 17 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
      const marker = L.marker([initialLatLng.lat, initialLatLng.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPinLatLng({ lat: p.lat, lng: p.lng });
      });
      mapRef.current = map;
      markerRef.current = marker;
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-medium text-gray-900 text-sm">Confirm exact location</p>
          <p className="text-xs text-gray-400 mt-0.5">Drag the pin to adjust your exact pickup point</p>
        </div>
        <div ref={mapDivRef} style={{ height: 280 }} />
        <div className="flex gap-3 px-4 py-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 py-2.5 text-sm font-medium text-gray-600">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(pinLatLng); onClose(); }}
            className="flex-1 rounded-sm bg-[#0ABAB5] py-2.5 text-sm font-medium text-white hover:bg-[#089e9a]"
          >
            Confirm Pin
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Haversine distance ─────────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Validation helpers ─────────────────────────────────────────────────────
function isFullName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts[0].length > 0 && parts[parts.length - 1].length > 0;
}

function isPHPhone(phone: string) {
  const cleaned = phone.replace(/\s|-/g, "");
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

// ── Constants ──────────────────────────────────────────────────────────────
const API = "https://aunt-sallys-pos.onrender.com";

const DETERGENT_BRANDS = ["Ariel", "Surf", "Breeze"];
const FABCON_BRANDS = ["Ariel", "Surf", "Breeze"];

function needsBrandSelection(serviceName: string): "detergent" | "fabcon" | null {
  const lower = serviceName.toLowerCase();
  if (lower.includes("detergent")) return "detergent";
  if (lower.includes("fabcon")) return "fabcon";
  return null;
}

type Step = "info" | "address" | "branch" | "services" | "review";

interface Branch {
  id: string;
  name: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
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
  brand?: string;
}

interface AddressFields {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
}

const EMPTY_ADDRESS: AddressFields = { street: "", barangay: "", city: "", province: "", postalCode: "" };

const STEP_LABELS: Record<Step, string> = {
  info:     "Your Info",
  address:  "Address",
  branch:   "Branch",
  services: "Services",
  review:   "Review",
};
const STEPS: Step[] = ["info", "address", "branch", "services", "review"];

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
  "wash_dry_fold", "wash_dry_press", "dry_only", "heavy_wash",
  "comforter", "dry_clean", "addon", "logistics",
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
  const [nameError, setNameError]   = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2 — address
  const [addressFields, setAddressFields] = useState<AddressFields>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<Partial<AddressFields>>({});
  const [pinLatLng, setPinLatLng] = useState<LatLng | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [driverNotes, setDriverNotes] = useState("");

  // Step 3 — branch
  const [branchId, setBranchId] = useState("");
  const [nearestBranchId, setNearestBranchId] = useState("");

  // Step 4 — services
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [brandPickerId, setBrandPickerId] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const fullAddress = [
    addressFields.street,
    addressFields.barangay,
    addressFields.city,
    addressFields.province,
    addressFields.postalCode,
  ].filter(Boolean).join(", ");

  // Load branches + services
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
      } catch { /* fail silently */ }
      finally { setLoadingData(false); }
    }
    load();
  }, []);

  // Auto-select nearest branch when we have pin coords
  useEffect(() => {
    if (!pinLatLng || branches.length === 0) return;
    let nearestId = "";
    let nearestDist = Infinity;
    for (const b of branches) {
      if (!b.lat || !b.lng) continue;
      const d = haversineKm(pinLatLng.lat, pinLatLng.lng, parseFloat(b.lat), parseFloat(b.lng));
      if (d < nearestDist) { nearestDist = d; nearestId = b.id; }
    }
    if (nearestId) {
      setNearestBranchId(nearestId);
      setBranchId((prev) => prev || nearestId); // only auto-set if not manually chosen
    }
  }, [pinLatLng, branches]);

  // ── Step validation ──────────────────────────────────────────────────────

  function validateInfo(): boolean {
    let ok = true;
    if (!isFullName(name)) {
      setNameError("Please enter your full name (first and last name)");
      ok = false;
    } else {
      setNameError("");
    }
    if (!isPHPhone(phone)) {
      setPhoneError("Please enter a valid Philippine mobile number (e.g. 09171234567)");
      ok = false;
    } else {
      setPhoneError("");
    }
    return ok;
  }

  function validateAddress(): boolean {
    const errs: Partial<AddressFields> = {};
    if (!addressFields.street.trim()) errs.street = "Required";
    if (!addressFields.barangay.trim()) errs.barangay = "Required";
    if (!addressFields.city.trim()) errs.city = "Required";
    if (!addressFields.province.trim()) errs.province = "Required";
    if (!addressFields.postalCode.trim()) errs.postalCode = "Required";
    else if (!/^\d+$/.test(addressFields.postalCode.trim())) errs.postalCode = "Postal code must be numeric";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInfoContinue() {
    if (validateInfo()) setStep("address");
  }

  function handleAddressContinue() {
    if (validateAddress()) setStep("branch");
  }

  // ── Services logic ───────────────────────────────────────────────────────

  function addItem(svc: Service) {
    const price = parseFloat(svc.basePrice);
    const brandType = needsBrandSelection(svc.name);

    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === svc.id);
      if (existing) {
        return prev.map((i) => i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (brandType) {
        // Open brand picker before adding
        setBrandPickerId(svc.id);
        return prev;
      }
      return [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: price, priceUnit: svc.priceUnit }];
    });

    if (brandType && !items.find((i) => i.serviceId === svc.id)) {
      setBrandPickerId(svc.id);
    }
  }

  function confirmBrand(svc: Service, brand: string) {
    const price = parseFloat(svc.basePrice);
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === svc.id);
      if (existing) return prev.map((i) => i.serviceId === svc.id ? { ...i, quantity: i.quantity + 1, brand } : i);
      return [...prev, { serviceId: svc.id, name: svc.name, quantity: 1, unitPrice: price, priceUnit: svc.priceUnit, brand }];
    });
    setBrandPickerId(null);
  }

  function decreaseItem(serviceId: string) {
    setItems((prev) =>
      prev.map((i) => i.serviceId === serviceId ? { ...i, quantity: i.quantity - 1 } : i)
          .filter((i) => i.quantity > 0)
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const notesLines: string[] = [];
      if (driverNotes.trim()) notesLines.push(driverNotes.trim());

      const res = await fetch(`${API}/api/v1/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          address: fullAddress,
          addressLat: pinLatLng?.lat ?? undefined,
          addressLng: pinLatLng?.lng ?? undefined,
          branchId,
          notes: notesLines.join("\n") || undefined,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.brand ? `Brand: ${i.brand}` : undefined,
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

  // ── Confirmation screen ──────────────────────────────────────────────────
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
              Thank you, {name}. We&apos;ve received your booking and will be in touch shortly.
            </p>
            <div className="mb-8 border border-[#0ABAB5]/20 bg-[#0ABAB5]/5 px-6 py-5">
              <p className="mb-1 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">Tracking Code</p>
              <p className="font-display text-3xl font-light tracking-widest text-gray-900">{trackingCode}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Link href={`/track?code=${trackingCode}`} className="rounded-sm bg-[#0ABAB5] px-8 py-3 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors">
                Track Order
              </Link>
              <Link href="/" className="rounded-sm border border-gray-200 px-8 py-3 text-sm font-medium tracking-wide text-gray-600 hover:border-[#0ABAB5]/40 transition-colors">
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

          <h1 className="font-display mt-6 mb-10 text-4xl font-light text-gray-900">Book a Pickup</h1>

          {/* Step indicator */}
          <div className="mb-10 flex items-center flex-wrap gap-y-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div className={`h-px w-6 transition-colors ${STEPS.indexOf(step) >= i ? "bg-[#0ABAB5]" : "bg-gray-200"}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    step === s ? "bg-[#0ABAB5] text-white"
                    : STEPS.indexOf(step) > i ? "bg-[#0ABAB5]/20 text-[#0ABAB5]"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    {STEPS.indexOf(step) > i ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span className={`text-xs tracking-wide ${step === s ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                    {STEP_LABELS[s]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Step 1: Customer Info ───────────────────────────────── */}
          {step === "info" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (nameError) setNameError(""); }}
                  placeholder="Maria Santos"
                  className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${nameError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                />
                {nameError && <p className="mt-1.5 text-xs text-red-500">{nameError}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(""); }}
                  placeholder="09171234567"
                  className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${phoneError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                />
                {phoneError && <p className="mt-1.5 text-xs text-red-500">{phoneError}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Email Address <span className="normal-case text-gray-300">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maria@example.com"
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                />
              </div>

              <button
                onClick={handleInfoContinue}
                className="w-full rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* ── Step 2: Address ──────────────────────────────────────── */}
          {step === "address" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Street / Unit / House No.</label>
                <input
                  type="text"
                  value={addressFields.street}
                  onChange={(e) => { setAddressFields((f) => ({ ...f, street: e.target.value })); setAddressErrors((e2) => ({ ...e2, street: "" })); }}
                  placeholder="123 Sampaguita St., Unit 4B"
                  className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${addressErrors.street ? "border-red-300" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                />
                {addressErrors.street && <p className="mt-1 text-xs text-red-500">{addressErrors.street}</p>}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Barangay</label>
                <input
                  type="text"
                  value={addressFields.barangay}
                  onChange={(e) => { setAddressFields((f) => ({ ...f, barangay: e.target.value })); setAddressErrors((e2) => ({ ...e2, barangay: "" })); }}
                  placeholder="Barangay Poblacion"
                  className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${addressErrors.barangay ? "border-red-300" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                />
                {addressErrors.barangay && <p className="mt-1 text-xs text-red-500">{addressErrors.barangay}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">City / Municipality</label>
                  <input
                    type="text"
                    value={addressFields.city}
                    onChange={(e) => { setAddressFields((f) => ({ ...f, city: e.target.value })); setAddressErrors((e2) => ({ ...e2, city: "" })); }}
                    placeholder="Mandaue City"
                    className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${addressErrors.city ? "border-red-300" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                  />
                  {addressErrors.city && <p className="mt-1 text-xs text-red-500">{addressErrors.city}</p>}
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Province</label>
                  <input
                    type="text"
                    value={addressFields.province}
                    onChange={(e) => { setAddressFields((f) => ({ ...f, province: e.target.value })); setAddressErrors((e2) => ({ ...e2, province: "" })); }}
                    placeholder="Cebu"
                    className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${addressErrors.province ? "border-red-300" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                  />
                  {addressErrors.province && <p className="mt-1 text-xs text-red-500">{addressErrors.province}</p>}
                </div>
              </div>

              <div className="sm:max-w-[200px]">
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">Postal Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={addressFields.postalCode}
                  onChange={(e) => { setAddressFields((f) => ({ ...f, postalCode: e.target.value })); setAddressErrors((e2) => ({ ...e2, postalCode: "" })); }}
                  placeholder="6014"
                  className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${addressErrors.postalCode ? "border-red-300" : "border-gray-200 focus:border-[#0ABAB5]"}`}
                />
                {addressErrors.postalCode && <p className="mt-1 text-xs text-red-500">{addressErrors.postalCode}</p>}
              </div>

              {/* Map pin */}
              <div className="border border-dashed border-gray-200 p-4 rounded-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pin Your Location</p>
                    <p className="text-xs text-gray-400 mt-0.5">Help our driver find you exactly</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const ll = pinLatLng ?? { lat: 10.3157, lng: 123.8854 };
                      setPinLatLng(ll);
                      setShowMapModal(true);
                    }}
                    className="rounded-sm border border-[#0ABAB5] px-3 py-1.5 text-xs font-medium text-[#0ABAB5] hover:bg-[#0ABAB5]/5 transition-colors"
                  >
                    {pinLatLng ? "📍 Update Pin" : "📍 Pin Location"}
                  </button>
                </div>
                {pinLatLng && (
                  <p className="mt-2 text-xs text-[#0ABAB5]">Location pinned ✓</p>
                )}
              </div>

              {/* Notes for driver */}
              <div>
                <label className="mb-2 block text-xs font-medium tracking-widest text-gray-500 uppercase">
                  Notes for Driver <span className="normal-case text-gray-300">(optional)</span>
                </label>
                <textarea
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="e.g. Unit 4B, Blue Gate. Or: Leaving laundry with reception."
                  rows={3}
                  className="w-full border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("info")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleAddressContinue}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Branch Selection ─────────────────────────────── */}
          {step === "branch" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {nearestBranchId
                  ? "We found your nearest branch. You can change it if you prefer."
                  : "Select your preferred Aunt Sally\u2019s branch."}
              </p>
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{b.name}</span>
                            {b.id === nearestBranchId && (
                              <span className="rounded-full bg-[#0ABAB5]/10 px-2 py-0.5 text-xs text-[#0ABAB5] font-medium">📍 Nearest to you</span>
                            )}
                          </div>
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
                <button onClick={() => setStep("address")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">
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

          {/* ── Step 4: Services ─────────────────────────────────────── */}
          {step === "services" && (
            <div className="space-y-4">
              {loadingData ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading services…</div>
              ) : (
                <div className="space-y-6">
                  {serviceGroups.map((group) => (
                    <div key={group.key}>
                      <div className="mb-2 text-xs font-medium tracking-widest text-gray-400 uppercase">{group.label}</div>
                      <div className="space-y-2">
                        {group.services.map((svc) => {
                          const item = items.find((i) => i.serviceId === svc.id);
                          const price = parseFloat(svc.basePrice);
                          const brandType = needsBrandSelection(svc.name);
                          const isPicking = brandPickerId === svc.id;
                          return (
                            <div
                              key={svc.id}
                              className={`border bg-white p-4 transition-colors ${item ? "border-[#0ABAB5]/40" : "border-gray-100"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{svc.name}</div>
                                  <div className="text-xs text-gray-400">₱{price.toLocaleString()}/{svc.priceUnit}</div>
                                  {item?.brand && (
                                    <div className="text-xs text-[#0ABAB5] mt-0.5">Brand: {item.brand}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {item && (
                                    <>
                                      <button
                                        onClick={() => decreaseItem(svc.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                                      >–</button>
                                      <span className="w-5 text-center text-sm font-medium text-gray-900">{item.quantity}</span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => addItem(svc)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0ABAB5] text-white hover:bg-[#089e9a] transition-colors"
                                  >+</button>
                                </div>
                              </div>

                              {/* Brand picker inline */}
                              {isPicking && brandType && (
                                <div className="mt-3 border-t border-gray-100 pt-3">
                                  <p className="text-xs font-medium text-gray-600 mb-2">Choose your {brandType} brand:</p>
                                  <div className="flex gap-2 flex-wrap">
                                    {(brandType === "detergent" ? DETERGENT_BRANDS : FABCON_BRANDS).map((brand) => (
                                      <button
                                        key={brand}
                                        onClick={() => confirmBrand(svc, brand)}
                                        className="rounded-full border border-[#0ABAB5] px-3 py-1 text-xs font-medium text-[#0ABAB5] hover:bg-[#0ABAB5]/10 transition-colors"
                                      >
                                        {brand}
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => setBrandPickerId(null)}
                                      className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
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
                        <span>{i.name}{i.brand ? ` (${i.brand})` : ""} × {i.quantity}</span>
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
                <button onClick={() => setStep("branch")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">← Back</button>
                <button
                  disabled={items.length === 0}
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
                >Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 5: Review ────────────────────────────────────────── */}
          {step === "review" && (
            <div className="space-y-6">
              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">Your Information</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-400">Name</dt><dd className="text-gray-900">{name}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-400">Phone</dt><dd className="text-gray-900">{phone}</dd></div>
                  {email && <div className="flex justify-between"><dt className="text-gray-400">Email</dt><dd className="text-gray-900">{email}</dd></div>}
                  <div className="flex justify-between gap-4"><dt className="text-gray-400 shrink-0">Address</dt><dd className="text-right text-gray-900">{fullAddress}{pinLatLng ? " 📍" : ""}</dd></div>
                  {driverNotes && <div className="flex justify-between gap-4"><dt className="text-gray-400 shrink-0">Driver Notes</dt><dd className="text-right text-gray-900 max-w-[60%]">{driverNotes}</dd></div>}
                  <div className="flex justify-between"><dt className="text-gray-400">Branch</dt><dd className="text-gray-900">{selectedBranch?.name}</dd></div>
                </dl>
              </div>

              <div className="border border-gray-100 bg-white p-5">
                <div className="mb-4 text-xs font-medium tracking-widest text-gray-400 uppercase">Order Summary</div>
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i.serviceId} className="flex justify-between text-sm">
                      <span className="text-gray-500">{i.name}{i.brand ? ` (${i.brand})` : ""} × {i.quantity}</span>
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
                <button onClick={() => setStep("services")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">← Back</button>
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

      {/* Map pin modal */}
      {showMapModal && pinLatLng && (
        <MapPinModal
          initialLatLng={pinLatLng}
          onConfirm={(ll) => setPinLatLng(ll)}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </>
  );
}
