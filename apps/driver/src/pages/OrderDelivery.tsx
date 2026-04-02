import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export function OrderDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [delivering, setDelivering] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  async function fetchOrder() {
    try {
      const res = await api.driver.getOrders(user?.branchId);
      // data is now { available_pickup, available_delivery, my_orders }
      const allOrders = [
        ...(res.data.available_pickup ?? []),
        ...(res.data.available_delivery ?? []),
        ...(res.data.my_orders ?? []),
      ];
      const found = allOrders.find((o: any) => o.id === id);
      if (found) setOrder(found);
      else setError("Order not found");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  // Initialize Leaflet map when order has delivery address coords
  useEffect(() => {
    if (!order || !mapRef.current || leafletMap.current) return;

    const delivery = order.delivery;
    // Try to get lat/lng from delivery address
    let lat: number | null = null;
    let lng: number | null = null;

    if (delivery?.lat) { lat = parseFloat(delivery.lat); lng = parseFloat(delivery.lng); }

    // Default to Metro Manila if no coords
    const center: [number, number] = (lat && lng) ? [lat, lng] : [14.5995, 120.9842];

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default ?? leafletModule;

      (L.Icon.Default.prototype as any)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;
      const map = L.map(mapRef.current, { center, zoom: lat ? 16 : 12 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      if (lat && lng) {
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<b>${order.customerName}</b>`)
          .openPopup();
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
          onClick={() => navigate("/dashboard")}
          className="mt-8 rounded-2xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          ← Back
        </button>
      </header>

      {/* Order info */}
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
          {order.delivery?.notes && (
            <p className="mt-2 text-sm text-gray-500">{order.delivery.notes}</p>
          )}
        </div>

        {/* Map */}
        <div className="rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
          <div ref={mapRef} style={{ height: 220, width: "100%" }} />
          {order.delivery && !order.delivery.lat && (
            <div className="bg-yellow-50 px-4 py-2 text-xs text-yellow-700">
              No GPS coordinates for this address.
            </div>
          )}
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
        </div>

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
    </div>
  );
}
