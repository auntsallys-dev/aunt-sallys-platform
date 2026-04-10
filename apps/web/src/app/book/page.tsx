"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

// ── Nominatim autocomplete ─────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    house_number?: string;
  };
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (result: NominatimResult) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const API_BASE = "https://aunt-sallys-pos.onrender.com";
      const res = await fetch(`${API_BASE}/api/v1/public/geocode?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      const data: NominatimResult[] = json.data ?? [];
      setSuggestions(data);
      setShowDropdown(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(v: string) {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 400);
  }

  function handleSelect(r: NominatimResult) {
    onChange(r.display_name.split(",")[0].trim());
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(r);
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className={`w-full border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-colors ${
            hasError ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#0ABAB5]"
          }`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ABAB5] border-t-transparent" />
          </div>
        )}
      </div>
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-sm border border-gray-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((r) => {
            const parts = r.display_name.split(",");
            const primary = parts.slice(0, 2).join(",").trim();
            const secondary = parts.slice(2, 5).join(",").trim();
            return (
              <li key={r.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                  className="w-full text-left px-4 py-3 hover:bg-[#0ABAB5]/5 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#0ABAB5] flex-shrink-0">📍</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 leading-tight">{primary}</div>
                      {secondary && <div className="text-xs text-gray-400 mt-0.5">{secondary}</div>}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Map pin component (Leaflet) ────────────────────────────────────────────
interface LatLng { lat: number; lng: number; }

// SVG pin icon for Leaflet (avoids broken default marker image URLs)
const SVG_PIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 16 26 16 26S32 26.5 32 16C32 7.163 24.837 0 16 0z" fill="#0ABAB5"/>
  <circle cx="16" cy="16" r="7" fill="white"/>
</svg>`;

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
    // Load Leaflet CSS dynamically to ensure it's available before map init
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    import("leaflet").then((m) => {
      const L = m.default ?? m;
      const map = L.map(mapDivRef.current!, { center: [initialLatLng.lat, initialLatLng.lng], zoom: 17 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);

      // Use SVG divIcon — no external image dependencies
      const icon = L.divIcon({
        html: SVG_PIN_ICON,
        className: "",
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([initialLatLng.lat, initialLatLng.lng], { draggable: true, icon }).addTo(map);
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

type Step = "info" | "address" | "branch" | "services" | "return" | "review";

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

const EMPTY_ADDRESS: AddressFields = { street: "", barangay: "", city: "", province: "Metro Manila", postalCode: "" };

// Hardcoded branch coordinates for nearest-branch calculation
const BRANCH_COORDS: Record<string, { lat: number; lng: number }> = {
  "f9437afe-d70e-49df-b33a-f86f11742078": { lat: 14.632216231184879, lng: 121.07551760144263 }, // Arton Rockwell
  "601c564b-ce8e-48f0-b7b2-f48e2fefb884": { lat: 14.580401046904841, lng: 121.06478171994054 }, // Ayala 30th
  "93084732-fcd9-4cd0-95d8-45342fa70743": { lat: 14.586343706805547, lng: 121.07843234113705 }, // Tiendesitas
  "c8a3216c-a340-4103-898b-e000699beb52": { lat: 14.635859971943153, lng: 121.06777910492383 }, // Xavierville
};

const STEP_LABELS: Record<Step, string> = {
  info:     "Your Info",
  address:  "Address",
  branch:   "Branch",
  services: "Services",
  return:   "Return",
  review:   "Review",
};
const STEPS: Step[] = ["info", "address", "branch", "services", "return", "review"];

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
  "comforter", "dry_clean", "addon",
  // "logistics" excluded — automatically added by server for website bookings
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

  // Client profile state
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileQuestion, setProfileQuestion] = useState(1);
  const [clientProfile, setClientProfile] = useState<{
    gender?: string;
    age?: number;
    maritalStatus?: string;
    livesAlone?: boolean;
    housingType?: string;
    hasHelper?: boolean;
    frequentServices: string[];
    emailOrderUpdates: boolean;
    emailPromos: boolean;
  }>({ frequentServices: [], emailOrderUpdates: true, emailPromos: false });

  // Remote data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ReturnType<typeof groupServices>>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Step 1 — info
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [email, setEmail]     = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [manualMode, setManualMode] = useState(false);

  // Step 4 — services
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [brandPickerId, setBrandPickerId] = useState<string | null>(null);

  // Step 5 — return method
  const [returnMethod, setReturnMethod] = useState<"delivery" | "self_pickup">("delivery");

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

  // Auto-select nearest branch from pin coords (fallback)
  useEffect(() => {
    if (!pinLatLng || branches.length === 0 || nearestBranchId) return;
    findNearestBranch(pinLatLng.lat, pinLatLng.lng);
  }, [pinLatLng, branches]);

  function findNearestBranch(lat: number, lng: number) {
    let nearestId = "";
    let nearestDist = Infinity;
    for (const b of branches) {
      const coords = BRANCH_COORDS[b.id];
      if (!coords) continue;
      const d = haversineKm(lat, lng, coords.lat, coords.lng);
      if (d < nearestDist) { nearestDist = d; nearestId = b.id; }
    }
    if (nearestId) {
      setNearestBranchId(nearestId);
      setBranchId((prev) => (!prev || !manualMode) ? nearestId : prev);
    }
  }

  function requestGPS() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        findNearestBranch(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsLoading(false);
        setGpsError("Could not get your location. Please select a branch manually.");
        setManualMode(true);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

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
    // province is always "Metro Manila" — no validation needed
    if (!addressFields.postalCode.trim()) errs.postalCode = "Required";
    else if (!/^\d+$/.test(addressFields.postalCode.trim())) errs.postalCode = "Postal code must be numeric";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleInfoContinue() {
    if (validateInfo()) setStep("address");
  }

  function handleAddressContinue() {
    if (validateAddress()) {
      setStep("branch");
      // Auto-trigger GPS on entering branch step if no nearest branch yet
      if (!nearestBranchId) requestGPS();
    }
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
          returnMethod,
          notes: notesLines.join("\n") || undefined,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            notes: i.brand ? `Brand: ${i.brand}` : undefined,
          })),
          ...(profileSaved && {
            gender: clientProfile.gender,
            age: clientProfile.age,
            maritalStatus: clientProfile.maritalStatus,
            livesAlone: clientProfile.livesAlone,
            housingType: clientProfile.housingType,
            hasHelper: clientProfile.hasHelper,
            frequentServices: clientProfile.frequentServices.length > 0 ? clientProfile.frequentServices : undefined,
            emailOrderUpdates: clientProfile.emailOrderUpdates,
            emailPromos: clientProfile.emailPromos,
          }),
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
                {email.trim().length > 3 && (
                  <label className="mt-2.5 flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={emailOptIn}
                      onChange={(e) => {
                        setEmailOptIn(e.target.checked);
                        setClientProfile((p) => ({ ...p, emailOrderUpdates: e.target.checked }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 accent-[#0ABAB5] cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">Keep me posted on my order status via email</span>
                  </label>
                )}
              </div>

              {/* ── New Client Profile Section ── */}
              {!profileSaved ? (
                !profileExpanded ? (
                  <div className="border border-dashed border-[#0ABAB5]/40 bg-[#0ABAB5]/5 p-5 rounded-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🎁</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">New client? Unlock exclusive discounts &amp; promos</p>
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                          Fill this out once and we&apos;ll send you personalized offers, priority deals, and order updates straight to your inbox.
                        </p>
                        <button
                          type="button"
                          onClick={() => { setProfileExpanded(true); setProfileQuestion(1); }}
                          className="mt-3 rounded-sm bg-[#0ABAB5] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#089e9a] transition-colors"
                        >
                          Yes, I want discounts →
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-[#0ABAB5]/30 bg-white rounded-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-[#0ABAB5]/5">
                      <p className="text-xs font-semibold text-[#0ABAB5] uppercase tracking-widest">New Client Profile</p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">Question {profileQuestion} of 7</span>
                        <button
                          type="button"
                          onClick={() => { setProfileExpanded(false); setProfileSaved(true); }}
                          className="text-gray-300 hover:text-gray-500 text-lg leading-none"
                          aria-label="Close"
                        >×</button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-gray-100">
                      <div
                        className="h-1 bg-[#0ABAB5] transition-all duration-300"
                        style={{ width: `${(profileQuestion / 7) * 100}%` }}
                      />
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Q1: Gender */}
                      {profileQuestion === 1 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">What&apos;s your gender?</p>
                          <div className="flex flex-wrap gap-2">
                            {["Male", "Female", "Prefer not to say"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setClientProfile((p) => ({ ...p, gender: opt }))}
                                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                  clientProfile.gender === opt
                                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                                    : "border-gray-200 text-gray-600 hover:border-[#0ABAB5]/50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q2: Age */}
                      {profileQuestion === 2 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">How old are you?</p>
                          <input
                            type="number"
                            min={16}
                            max={100}
                            value={clientProfile.age ?? ""}
                            onChange={(e) => setClientProfile((p) => ({ ...p, age: e.target.value ? parseInt(e.target.value) : undefined }))}
                            placeholder="e.g. 28"
                            className="w-32 border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:border-[#0ABAB5] focus:outline-none transition-colors"
                          />
                        </div>
                      )}

                      {/* Q3: Marital Status */}
                      {profileQuestion === 3 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">What&apos;s your relationship status?</p>
                          <div className="flex gap-2">
                            {["Single", "Married"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setClientProfile((p) => ({ ...p, maritalStatus: opt }))}
                                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                  clientProfile.maritalStatus === opt
                                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                                    : "border-gray-200 text-gray-600 hover:border-[#0ABAB5]/50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q4: Lives Alone */}
                      {profileQuestion === 4 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">Do you live alone?</p>
                          <div className="flex gap-2">
                            {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setClientProfile((p) => ({ ...p, livesAlone: opt.value }))}
                                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                  clientProfile.livesAlone === opt.value
                                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                                    : "border-gray-200 text-gray-600 hover:border-[#0ABAB5]/50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q5: Housing Type */}
                      {profileQuestion === 5 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">What type of home do you live in?</p>
                          <div className="flex flex-wrap gap-2">
                            {["Condo", "Townhouse", "House", "Dorm", "Other"].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setClientProfile((p) => ({ ...p, housingType: opt }))}
                                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                  clientProfile.housingType === opt
                                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                                    : "border-gray-200 text-gray-600 hover:border-[#0ABAB5]/50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q6: Has Helper */}
                      {profileQuestion === 6 && (
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-3">Do you have a maid or helper for laundry?</p>
                          <div className="flex gap-2">
                            {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setClientProfile((p) => ({ ...p, hasHelper: opt.value }))}
                                className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                                  clientProfile.hasHelper === opt.value
                                    ? "border-[#0ABAB5] bg-[#0ABAB5] text-white"
                                    : "border-gray-200 text-gray-600 hover:border-[#0ABAB5]/50"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Q7: Frequent Services + email prefs */}
                      {profileQuestion === 7 && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-800 mb-3">Which services do you think you&apos;ll use most? <span className="text-gray-400 font-normal">(select all that apply)</span></p>
                            <div className="space-y-2">
                              {["Comforter Wash", "Rug Cleaning", "Regular Wash & Fold", "Bed Sheet Wash", "Dry Cleaning", "Steam Cleaning"].map((svc) => {
                                const checked = clientProfile.frequentServices.includes(svc);
                                return (
                                  <label key={svc} className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                      onClick={() => setClientProfile((p) => ({
                                        ...p,
                                        frequentServices: checked
                                          ? p.frequentServices.filter((s) => s !== svc)
                                          : [...p.frequentServices, svc],
                                      }))}
                                      className={`h-5 w-5 flex-shrink-0 border-2 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
                                        checked ? "border-[#0ABAB5] bg-[#0ABAB5]" : "border-gray-300 group-hover:border-[#0ABAB5]/50"
                                      }`}
                                    >
                                      {checked && (
                                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-sm text-gray-700">{svc}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="border-t border-gray-100 pt-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Email Preferences</p>
                            {[
                              { key: "emailOrderUpdates" as const, label: "Send me order status updates to my email" },
                              { key: "emailPromos" as const, label: "Send me exclusive discounts and promos to my email" },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                <div
                                  onClick={() => setClientProfile((p) => ({ ...p, [key]: !p[key] }))}
                                  className={`h-5 w-5 flex-shrink-0 border-2 rounded-sm flex items-center justify-center cursor-pointer transition-colors ${
                                    clientProfile[key] ? "border-[#0ABAB5] bg-[#0ABAB5]" : "border-gray-300 group-hover:border-[#0ABAB5]/50"
                                  }`}
                                >
                                  {clientProfile[key] && (
                                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm text-gray-700">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 px-5 pb-5">
                      {profileQuestion > 1 ? (
                        <button
                          type="button"
                          onClick={() => setProfileQuestion((q) => q - 1)}
                          className="flex-1 border border-gray-200 py-2.5 text-xs font-medium text-gray-500 hover:border-gray-300 transition-colors"
                        >
                          ← Back
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProfileExpanded(false)}
                          className="flex-1 border border-gray-200 py-2.5 text-xs font-medium text-gray-400 hover:border-gray-300 transition-colors"
                        >
                          Skip
                        </button>
                      )}
                      {profileQuestion < 7 ? (
                        <button
                          type="button"
                          onClick={() => setProfileQuestion((q) => q + 1)}
                          className="flex-1 rounded-sm bg-[#0ABAB5] py-2.5 text-xs font-semibold text-white hover:bg-[#089e9a] transition-colors"
                        >
                          Next →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setProfileExpanded(false); setProfileSaved(true); }}
                          className="flex-1 rounded-sm bg-[#0ABAB5] py-2.5 text-xs font-semibold text-white hover:bg-[#089e9a] transition-colors"
                        >
                          Save &amp; Continue →
                        </button>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 border border-[#0ABAB5]/30 bg-[#0ABAB5]/5 px-4 py-3 rounded-sm">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0ABAB5]">
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#0ABAB5]">Profile saved — you&apos;re eligible for member discounts!</p>
                </div>
              )}

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
                <AddressAutocomplete
                  value={addressFields.street}
                  onChange={(v) => { setAddressFields((f) => ({ ...f, street: v })); setAddressErrors((e2) => ({ ...e2, street: "" })); }}
                  onSelect={(result) => {
                    const addr = result.address;
                    // Fill street with house number + road if available
                    const streetVal = [addr.house_number, addr.road].filter(Boolean).join(" ") || result.display_name.split(",")[0].trim();
                    // Auto-fill city and province from result
                    const cityVal = addr.city || addr.town || addr.municipality || "";
                    const provinceVal = addr.state || "";
                    const postalVal = addr.postcode || "";
                    const barangayVal = addr.suburb || "";
                    setAddressFields((f) => ({
                      ...f,
                      street: streetVal,
                      province: "Metro Manila", // always locked
                      ...(cityVal && { city: cityVal }),
                      ...(postalVal && { postalCode: postalVal }),
                      ...(barangayVal && !f.barangay && { barangay: barangayVal }),
                    }));
                    setAddressErrors({});
                    // Set map pin to selected location
                    const ll = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
                    setPinLatLng(ll);
                  }}
                  placeholder="123 Sampaguita St., Unit 4B"
                  hasError={!!addressErrors.street}
                />
                {addressErrors.street && <p className="mt-1 text-xs text-red-500">{addressErrors.street}</p>}
                <p className="mt-1.5 text-xs text-gray-400">Start typing to see suggestions, or enter manually</p>
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
                  <div className="relative">
                    <input
                      type="text"
                      value="Metro Manila"
                      readOnly
                      className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 cursor-not-allowed select-none focus:outline-none"
                      onFocus={(e) => e.target.blur()}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9-9a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Aunt Sally's is only currently available in Metro Manila</p>
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
              <div className={`border p-4 rounded-sm transition-colors ${pinLatLng ? "border-[#0ABAB5]/30 bg-[#0ABAB5]/5" : "border-dashed border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pin Your Exact Location</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pinLatLng
                        ? "Drag the pin to adjust your exact pickup point"
                        : "Help our driver find your exact gate or unit"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const ll = pinLatLng ?? { lat: 14.5547, lng: 121.0244 };
                      setPinLatLng(ll);
                      setShowMapModal(true);
                    }}
                    className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors ${
                      pinLatLng
                        ? "border-[#0ABAB5] bg-[#0ABAB5] text-white hover:bg-[#089e9a]"
                        : "border-[#0ABAB5] text-[#0ABAB5] hover:bg-[#0ABAB5]/5"
                    }`}
                  >
                    {pinLatLng ? "📍 Adjust Pin" : "📍 Pin Location"}
                  </button>
                </div>
                {pinLatLng && (
                  <p className="mt-2 text-xs text-[#0ABAB5] font-medium">✓ Location pinned — tap Adjust Pin to fine-tune</p>
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

              {/* GPS loading state */}
              {gpsLoading && (
                <div className="flex items-center gap-3 rounded-sm border border-[#0ABAB5]/20 bg-[#0ABAB5]/5 px-4 py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ABAB5] border-t-transparent flex-shrink-0" />
                  <p className="text-sm text-[#0ABAB5]">Finding your nearest branch…</p>
                </div>
              )}

              {/* Recommended branch banner */}
              {!gpsLoading && nearestBranchId && !manualMode && (
                <div className="rounded-sm border border-[#0ABAB5]/30 bg-[#0ABAB5]/5 px-4 py-3">
                  <p className="text-sm font-medium text-[#0ABAB5]">
                    📍 {branches.find(b => b.id === nearestBranchId)?.name} is recommended — it&apos;s the closest branch to you.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setManualMode(true); }}
                    className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                  >
                    Manually select your preferred Aunt Sally&apos;s branch
                  </button>
                </div>
              )}

              {/* GPS error */}
              {gpsError && (
                <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-700">{gpsError}</p>
                </div>
              )}

              {/* Manual mode header */}
              {manualMode && !gpsLoading && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Select your preferred Aunt Sally&apos;s branch.</p>
                  {nearestBranchId && (
                    <button
                      type="button"
                      onClick={() => { setManualMode(false); setBranchId(nearestBranchId); }}
                      className="text-xs text-[#0ABAB5] hover:underline"
                    >
                      ← Use recommended
                    </button>
                  )}
                </div>
              )}

              {loadingData ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading branches…</div>
              ) : (
                <div className="space-y-2">
                  {/* Show only recommended branch unless in manual mode */}
                  {(manualMode ? branches : branches.filter(b => b.id === nearestBranchId || !nearestBranchId)).map((b) => (
                    <button
                      key={b.id}
                      onClick={() => { setBranchId(b.id); if (manualMode) {} }}
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
                  onClick={() => setStep("return")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
                >Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 5: Return Method ─────────────────────────────────── */}
          {step === "return" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">How would you like to get your laundry back?</h2>
                <p className="text-sm text-gray-400">Choose your preferred return method.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Delivery card */}
                <button
                  type="button"
                  onClick={() => setReturnMethod("delivery")}
                  className={`text-left border p-5 transition-colors rounded-sm ${
                    returnMethod === "delivery"
                      ? "border-[#0ABAB5] bg-[#0ABAB5]/5 ring-1 ring-[#0ABAB5]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-3xl mb-3">🚚</div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">Deliver to my address</div>
                  <div className="text-xs text-gray-400">We'll bring it back to you</div>
                  {returnMethod === "delivery" && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#0ABAB5]">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>

                {/* Self-pickup card */}
                <button
                  type="button"
                  onClick={() => setReturnMethod("self_pickup")}
                  className={`text-left border p-5 transition-colors rounded-sm ${
                    returnMethod === "self_pickup"
                      ? "border-[#0ABAB5] bg-[#0ABAB5]/5 ring-1 ring-[#0ABAB5]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-3xl mb-3">🏪</div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">I'll pick it up</div>
                  <div className="text-xs text-gray-400">We'll notify you when ready</div>
                  {returnMethod === "self_pickup" && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#0ABAB5]">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>
              </div>

              {returnMethod === "self_pickup" && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-3 rounded-sm text-sm text-amber-700">
                  <span className="font-semibold">Note:</span> Pick-up &amp; Delivery fee (₱180) still applies — we're collecting from you.
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("services")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">← Back</button>
                <button
                  onClick={() => setStep("review")}
                  className="flex-1 rounded-sm bg-[#0ABAB5] py-4 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] transition-colors"
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 6: Review ────────────────────────────────────────── */}
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
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Return</dt>
                    <dd className="text-gray-900">
                      {returnMethod === "self_pickup"
                        ? `🏪 You'll pick up at ${selectedBranch?.name ?? "branch"}`
                        : `🚚 Delivered to your address`}
                    </dd>
                  </div>
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Pick-up &amp; Delivery (auto-added)</span>
                    <span className="text-gray-900">₱180</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-3 font-medium">
                    <span className="text-gray-900">Estimated Total</span>
                    <span style={{ color: "#0ABAB5" }}>₱{(subtotal + 180).toLocaleString()}</span>
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
                <button onClick={() => setStep("return")} className="flex-1 border border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 transition-colors">← Back</button>
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
