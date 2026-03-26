"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface StatusStep {
  label: string;
  description: string;
  completedAt: string | null;
}

interface TrackingData {
  trackingCode: string;
  customerName: string;
  status: string;
  steps: StatusStep[];
  orderId?: string;
}

interface DriverPosition {
  lat: number;
  lng: number;
  driverName?: string;
  updatedAt?: string;
}

const API = "https://aunt-sallys-pos.onrender.com";
const WS_URL = "wss://aunt-sallys-pos.onrender.com";

const STATUS_STEPS = [
  { key: "pending",          label: "Booking Received",    description: "Your booking has been received and is awaiting confirmation." },
  { key: "confirmed",        label: "Confirmed",           description: "Your booking has been confirmed. We're preparing for pickup." },
  { key: "picked_up",        label: "Picked Up",           description: "Your laundry has been picked up and is on its way to us." },
  { key: "processing",       label: "Processing",          description: "Your laundry is being washed, dried, and/or pressed." },
  { key: "ready",            label: "Ready",               description: "Your laundry is clean and ready for pickup or delivery." },
  { key: "out_for_delivery", label: "Out for Delivery",    description: "Your laundry is on its way back to you." },
  { key: "completed",        label: "Completed",           description: "Order complete. Thank you for choosing Aunt Sally's!" },
];

function buildSteps(currentStatus: string, history: { status: string; createdAt: string }[]): StatusStep[] {
  const historyMap: Record<string, string> = {};
  for (const h of history) historyMap[h.status] = h.createdAt;

  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === currentStatus);
  return STATUS_STEPS.map((s, i) => ({
    label: s.label,
    description: s.description,
    completedAt: i <= currentIdx && historyMap[s.key]
      ? new Date(historyMap[s.key]).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
      : i < currentIdx ? "Completed" : null,
  }));
}

// Driver location map using Leaflet (loaded dynamically)
function DriverMap({ position }: { position: DriverPosition }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default ?? leafletModule;

      if (!mapInstance.current) {
        (L.Icon.Default.prototype as any)._getIconUrl = undefined;
        L.Icon.Default.mergeOptions({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current!, {
          center: [position.lat, position.lng],
          zoom: 15,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© OpenStreetMap',
        }).addTo(map);

        const icon = L.divIcon({
          className: "",
          html: `<div style="background:#0ABAB5;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚗</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        markerRef.current = L.marker([position.lat, position.lng], { icon })
          .addTo(map)
          .bindPopup(position.driverName ?? "Your driver");

        mapInstance.current = map;
      } else {
        mapInstance.current.setView([position.lat, position.lng], 15);
        markerRef.current?.setLatLng([position.lat, position.lng]);
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update marker on position change
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    markerRef.current.setLatLng([position.lat, position.lng]);
    mapInstance.current.setView([position.lat, position.lng]);
  }, [position.lat, position.lng]);

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ height: 200, width: "100%", borderRadius: 4 }} />
    </div>
  );
}

function TrackPageInner() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [inputValue, setInputValue] = useState(searchParams.get("code") ?? "");
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const initial = searchParams.get("code");
    if (initial) {
      setCode(initial);
      setInputValue(initial);
      fetchTracking(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to driver location via WebSocket when order is out for delivery
  useEffect(() => {
    if (!data?.orderId || data.status !== "out_for_delivery") {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      return;
    }

    const ws = new WebSocket(`${WS_URL}/api/v1/ws/order:${data.orderId}:driver`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "driver_location") {
          setDriverPosition({
            lat: msg.lat,
            lng: msg.lng,
            updatedAt: msg.timestamp,
          });
        }
      } catch {}
    };
    wsRef.current = ws;

    return () => { ws.close(); };
  }, [data?.orderId, data?.status]);

  async function fetchTracking(trackingCode: string) {
    setLoading(true);
    setError(null);
    setData(null);
    setDriverPosition(null);
    try {
      const res = await fetch(`${API}/api/v1/public/track/${encodeURIComponent(trackingCode.trim().toUpperCase())}`);
      if (!res.ok) {
        setError("No booking found for that tracking code. Please check and try again.");
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setError("No booking found for that tracking code. Please check and try again.");
        return;
      }
      const order = json.data;
      setData({
        trackingCode: order.orderNumber,
        customerName: "",
        status: order.status,
        steps: buildSteps(order.status, order.history ?? []),
        orderId: order.id,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim().toUpperCase();
    setCode(trimmed);
    if (trimmed) fetchTracking(trimmed);
  }

  const completedCount = data?.steps.filter((s) => s.completedAt !== null).length ?? 0;

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-56px)] bg-[#fafafa]">
        <div className="mx-auto max-w-xl px-4 py-16">
          <Link href="/" className="text-xs tracking-widest text-[#0ABAB5] hover:text-[#089e9a] uppercase transition-colors">
            ← Home
          </Link>

          <h1 className="font-display mt-6 mb-2 text-4xl font-light text-gray-900">
            Track Your Order
          </h1>
          <p className="mb-10 text-sm leading-relaxed text-gray-400">
            Enter the tracking code you received after booking.
          </p>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="mb-10 flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="AS-XXXXXX"
              maxLength={9}
              className="flex-1 border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-300 tracking-widest focus:border-[#0ABAB5] focus:outline-none transition-colors uppercase"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className="rounded-sm bg-[#0ABAB5] px-6 py-3 text-sm font-medium tracking-wide text-white hover:bg-[#089e9a] disabled:opacity-40 transition-colors"
            >
              {loading ? "…" : "Track"}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Results */}
          {data && (
            <div>
              {/* Header card */}
              <div className="mb-8 border border-[#0ABAB5]/20 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">
                      Tracking Code
                    </p>
                    <p className="font-mono text-xl font-medium tracking-widest text-gray-900">
                      {data.trackingCode}
                    </p>
                    {data.customerName && (
                      <p className="mt-1 text-sm text-gray-400">{data.customerName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-[#0ABAB5]/10 px-3 py-1 text-xs font-medium text-[#0ABAB5]">
                      {data.status}
                    </span>
                    <p className="mt-2 text-xs text-gray-400">
                      {completedCount} of {data.steps.length} steps done
                    </p>
                  </div>
                </div>
              </div>

              {/* Live driver location (when out for delivery) */}
              {data.status === "out_for_delivery" && (
                <div className="mb-8 border border-[#0ABAB5]/20 bg-white p-4">
                  <p className="mb-3 text-xs font-medium tracking-widest text-[#0ABAB5] uppercase">
                    Live Driver Location
                  </p>
                  {driverPosition ? (
                    <>
                      <DriverMap position={driverPosition} />
                      {driverPosition.updatedAt && (
                        <p className="mt-2 text-xs text-gray-400">
                          Updated {new Date(driverPosition.updatedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="py-4 text-center text-sm text-gray-400">
                      Waiting for driver location…
                    </p>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-0">
                {data.steps.map((step, i) => {
                  const isCompleted = step.completedAt !== null;
                  const isCurrent   = !isCompleted && (i === 0 || data.steps[i - 1].completedAt !== null);
                  const isLast      = i === data.steps.length - 1;

                  return (
                    <div key={step.label} className="flex gap-4">
                      {/* Timeline column */}
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                          isCompleted
                            ? "bg-[#0ABAB5] text-white"
                            : isCurrent
                              ? "border-2 border-[#0ABAB5] bg-white"
                              : "border-2 border-gray-200 bg-white"
                        }`}>
                          {isCompleted ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <span className={`h-2.5 w-2.5 rounded-full ${isCurrent ? "bg-[#0ABAB5]" : "bg-gray-300"}`} />
                          )}
                        </div>
                        {!isLast && (
                          <div className={`mt-1 w-0.5 flex-1 min-h-[2rem] ${isCompleted ? "bg-[#0ABAB5]/30" : "bg-gray-100"}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-8 ${isLast ? "pb-0" : ""}`}>
                        <p className={`text-sm font-medium ${isCompleted ? "text-gray-900" : isCurrent ? "text-[#0ABAB5]" : "text-gray-300"}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs leading-relaxed mt-0.5 ${isCompleted ? "text-gray-400" : "text-gray-300"}`}>
                          {step.description}
                        </p>
                        {step.completedAt && (
                          <p className="mt-1 text-xs text-[#0ABAB5]/70">{step.completedAt}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!data && !error && !loading && !code && (
            <div className="border border-dashed border-gray-200 px-6 py-12 text-center">
              <p className="text-sm text-gray-400">Enter your tracking code above to see your order status.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <TrackPageInner />
    </Suspense>
  );
}
