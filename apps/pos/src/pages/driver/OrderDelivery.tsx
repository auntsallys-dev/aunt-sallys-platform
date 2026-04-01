import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

export function DriverOrderDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [copied, setCopied] = useState(false);

  // Payment collection state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "maya">("cash");
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  async function fetchOrder() {
    try {
      const branchId = user?.branchId ?? undefined;
      const res = await api.driver.getOrders(branchId);
      const found = res.data.find((o: any) => o.id === id);
      if (found) {
        setOrder(found);
        if (found.paymentStatus === "paid") setPaymentCollected(true);
      } else {
        setError("Order not found");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  // Initialize Leaflet map with both customer and driver pins
  useEffect(() => {
    if (!order || !mapRef.current || leafletMap.current) return;

    const delivery = order.delivery;
    let custLat: number | null = null;
    let custLng: number | null = null;

    if (delivery?.lat) {
      custLat = parseFloat(delivery.lat);
      custLng = parseFloat(delivery.lng);
    }

    const center: [number, number] = (custLat && custLng) ? [custLat, custLng] : [14.5995, 120.9842];

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default ?? leafletModule;

      (L.Icon.Default.prototype as any)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;
      const map = L.map(mapRef.current, { center, zoom: custLat ? 15 : 12 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const markers: [number, number][] = [];

      // Customer marker (teal)
      if (custLat && custLng) {
        const custIcon = L.divIcon({
          className: "",
          html: `<div style="background:#0ABAB5;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📍</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([custLat, custLng], { icon: custIcon })
          .addTo(map)
          .bindPopup(`<b>Customer</b><br/>${order.customerName}`)
          .openPopup();
        markers.push([custLat, custLng]);
      }

      // Driver marker (blue, from GPS)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const driverLat = pos.coords.latitude;
          const driverLng = pos.coords.longitude;

          const driverIcon = L.divIcon({
            className: "",
            html: `<div style="background:#2563EB;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🚗</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          L.marker([driverLat, driverLng], { icon: driverIcon })
            .addTo(map)
            .bindPopup("<b>You</b>");

          markers.push([driverLat, driverLng]);

          // Fit bounds to show both pins
          if (markers.length >= 2) {
            map.fitBounds(markers as any, { padding: [40, 40] });
          }
        });
      }

      leafletMap.current = map;
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [order]);

  async function handleCollectPayment() {
    if (!id) return;
    setCollectingPayment(true);
    setPaymentError("");
    try {
      await api.driver.collectPayment(id, paymentMethod);
      setPaymentCollected(true);
      setShowPaymentModal(false);
      setOrder((prev: any) => prev ? { ...prev, paymentStatus: "paid", paymentMethod } : prev);
    } catch (err: any) {
      setPaymentError(err.message ?? "Failed to collect payment");
    } finally {
      setCollectingPayment(false);
    }
  }

  async function handleMarkDelivered() {
    if (!id) return;
    setDelivering(true);
    try {
      await api.driver.markDelivered(id);
      setDelivered(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to mark as delivered");
    } finally {
      setDelivering(false);
    }
  }

  function handleCopyAddress() {
    const address = order?.delivery?.addressLine ?? order?.notes ?? "";
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading…</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500">← Back</button>
        <div className="text-red-600">{error || "Order not found"}</div>
      </div>
    );
  }

  if (delivered) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">Delivered!</h2>
        <p className="mt-2 text-gray-500">{order.orderNumber} marked as delivered.</p>
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="mt-8 rounded-2xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const delivery = order.delivery;
  const custLat = delivery?.lat ? parseFloat(delivery.lat) : null;
  const custLng = delivery?.lng ? parseFloat(delivery.lng) : null;
  // Address: try delivery.address (enriched), then fall back to notes field (which has pickup address)
  const address = delivery?.address ?? delivery?.addressLine ?? (order?.notes?.split("\n")[0] ?? "");

  const wazeUrl = custLat && custLng
    ? `https://waze.com/ul?ll=${custLat},${custLng}&navigate=yes&zoom=17`
    : `https://waze.com/ul?q=${encodeURIComponent(address)}`;
  const gmapsUrl = custLat && custLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
      </header>

      <div className="p-4 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Customer card */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="mb-1 font-mono text-xs text-gray-400">{order.orderNumber}</div>
          <h2 className="text-xl font-bold text-gray-900">{order.customerName}</h2>
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="mt-1 flex items-center gap-1.5 text-sm text-brand-600"
            >
              📞 {order.customerPhone}
            </a>
          )}

          {/* Address with copy button */}
          {address && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 flex items-start justify-between gap-2">
              <p className="text-sm text-gray-700 flex-1">{address}</p>
              <button
                onClick={handleCopyAddress}
                className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
          )}

          {delivery?.notes && (
            <p className="mt-2 text-sm text-gray-500">{delivery.notes}</p>
          )}
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
          <div ref={mapRef} style={{ height: 240, width: "100%" }} />
          {delivery && !delivery.lat && (
            <div className="bg-yellow-50 px-4 py-2 text-xs text-yellow-700">
              ⚠️ No GPS coordinates for this address.
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#00AAFF] py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            🟦 Open in Waze
          </a>
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#EA4335] py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            🔴 Google Maps
          </a>
        </div>

        {/* Order items */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 font-semibold text-gray-900">Order Items</h3>
          <div className="space-y-2">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <div className="text-gray-700">{item.serviceName ?? item.customName}</div>
                <div className="text-gray-500">×{item.quantity}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>₱{parseFloat(order.total).toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-gray-400">Payment</span>
            <span className={order.paymentStatus === "paid" ? "text-green-600 font-medium" : "text-orange-500"}>
              {order.paymentStatus === "paid" ? "✓ Paid" : "Unpaid"}
            </span>
          </div>
        </div>

        {/* Collect Payment button */}
        {order.paymentStatus !== "paid" && !paymentCollected && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            💳 Collect Payment
          </button>
        )}

        {(order.paymentStatus === "paid" || paymentCollected) && (
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700 ring-1 ring-green-200">
            ✓ Payment Collected
          </div>
        )}

        {/* Deliver button */}
        {!["delivered", "completed"].includes(order.status) && (
          <button
            disabled={delivering}
            onClick={handleMarkDelivered}
            className="w-full rounded-2xl bg-green-600 py-4 text-base font-bold text-white hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {delivering ? "Processing…" : "✓ Mark as Delivered"}
          </button>
        )}

        {["delivered", "completed"].includes(order.status) && (
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-700 ring-1 ring-green-200">
            ✅ Already delivered
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 mb-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Collect Payment</h2>
            <p className="text-sm text-gray-400 mb-4">Total: ₱{parseFloat(order.total).toFixed(2)}</p>

            {paymentError && (
              <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{paymentError}</div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              {(["cash", "gcash", "maya"] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-xl border-2 py-3 text-sm font-bold capitalize transition-colors ${
                    paymentMethod === method
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {method === "cash" ? "💵 Cash" : method === "gcash" ? "💙 GCash" : "💜 Maya"}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentError(""); }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCollectPayment}
                disabled={collectingPayment}
                className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {collectingPayment ? "Processing…" : `Confirm ${paymentMethod.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
