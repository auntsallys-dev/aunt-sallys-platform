import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { api } from "../../lib/api";

const WS_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/api\/v1$/, "");

interface DriverLocation {
  driver_id: string;
  branch_id: string;
  order_id: string | null;
  lat: string;
  lng: string;
  created_at: string;
  first_name: string;
  last_name: string;
  phone: string;
}

async function getLeaflet() {
  const L = await import("leaflet");
  return L.default ?? L;
}

export function AdminDriversPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [error, setError] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markers = useRef<Map<string, any>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);

  // Load branches
  useEffect(() => {
    api.branches.list()
      .then((d) => {
        if (d.success) {
          setBranches(d.data);
          if (d.data.length > 0) setSelectedBranch(d.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    getLeaflet().then((L) => {
      (L.Icon.Default.prototype as any)._getIconUrl = undefined;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [14.5995, 120.9842],
        zoom: 12,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      leafletMap.current = map;
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Load drivers and locations when branch changes
  useEffect(() => {
    if (!selectedBranch) return;

    api.admin.drivers.list(selectedBranch)
      .then((res) => setDrivers(res.data))
      .catch(() => {});

    api.admin.drivers.locations(selectedBranch)
      .then((res) => {
        const locs = new Map<string, DriverLocation>();
        const rows = Array.isArray(res.data) ? res.data : ((res.data as any).rows ?? []);
        for (const row of rows) {
          locs.set(row.driver_id, row);
        }
        setDriverLocations(locs);
      })
      .catch(() => {});
  }, [selectedBranch]);

  // WebSocket for live updates
  useEffect(() => {
    if (!selectedBranch) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsBase = WS_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsBase}/api/v1/ws/branch:${selectedBranch}:drivers`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "driver_location") {
          setDriverLocations((prev) => {
            const next = new Map(prev);
            next.set(data.driverId, {
              driver_id: data.driverId,
              branch_id: data.branchId,
              order_id: data.orderId,
              lat: String(data.lat),
              lng: String(data.lng),
              created_at: data.timestamp,
              first_name: prev.get(data.driverId)?.first_name ?? "",
              last_name: prev.get(data.driverId)?.last_name ?? "",
              phone: prev.get(data.driverId)?.phone ?? "",
            });
            return next;
          });
        }
      } catch {}
    };

    ws.onerror = () => setError("WebSocket connection failed — showing last known locations");
    wsRef.current = ws;

    return () => { ws.close(); };
  }, [selectedBranch]);

  // Update map markers
  useEffect(() => {
    if (!leafletMap.current) return;

    getLeaflet().then((L) => {
      const driverMap = new Map(drivers.map((d) => [d.id, d]));

      for (const [driverId, loc] of driverLocations) {
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lng);
        if (isNaN(lat) || isNaN(lng)) continue;

        const driver = driverMap.get(driverId);
        const name = loc.first_name
          ? `${loc.first_name} ${loc.last_name}`.trim()
          : driver
            ? `${driver.firstName} ${driver.lastName}`.trim()
            : "Driver";

        if (markers.current.has(driverId)) {
          markers.current.get(driverId).setLatLng([lat, lng]);
        } else {
          const icon = L.divIcon({
            className: "",
            html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          });

          const marker = L.marker([lat, lng], { icon })
            .addTo(leafletMap.current)
            .bindPopup(`<b>${name}</b><br>${loc.phone ?? ""}`);

          markers.current.set(driverId, marker);
        }
      }
    });
  }, [driverLocations, drivers]);

  const branchName = branches.find((b) => b.id === selectedBranch)?.name ?? "";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Tracking</h1>
            <p className="text-sm text-gray-500">Live driver locations — updates every 10 seconds</p>
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-yellow-50 px-4 py-2 text-sm text-yellow-700">{error}</div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Driver list sidebar */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {driverLocations.size} active · {drivers.length} total
            </p>
          </div>
          {drivers.map((driver) => {
            const loc = driverLocations.get(driver.id);
            const isActive = !!loc;
            return (
              <div
                key={driver.id}
                className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  if (loc && leafletMap.current) {
                    leafletMap.current.setView([parseFloat(loc.lat), parseFloat(loc.lng)], 16);
                  }
                }}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  isActive ? "bg-brand-600" : "bg-gray-300"
                }`}>
                  {driver.firstName[0]}{driver.lastName?.[0] ?? ""}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {driver.firstName} {driver.lastName}
                  </div>
                  <div className={`text-xs ${isActive ? "text-green-600" : "text-gray-400"}`}>
                    {isActive ? "● Active" : "Offline"}
                  </div>
                </div>
              </div>
            );
          })}
          {drivers.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No drivers for {branchName}
            </div>
          )}
        </div>

        {/* Map */}
        <div ref={mapRef} className="flex-1" />
      </div>
    </div>
  );
}
