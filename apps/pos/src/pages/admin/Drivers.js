import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { api } from "../../lib/api";
const WS_URL = import.meta.env.VITE_WS_URL ?? (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/api\/v1$/, "");
async function getLeaflet() {
    const L = await import("leaflet");
    return L.default ?? L;
}
export function AdminDriversPage() {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");
    const [drivers, setDrivers] = useState([]);
    const [driverLocations, setDriverLocations] = useState(new Map());
    const [error, setError] = useState("");
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    const markers = useRef(new Map());
    const wsRef = useRef(null);
    // Load branches
    useEffect(() => {
        api.branches.list()
            .then((d) => {
            if (d.success) {
                setBranches(d.data);
                if (d.data.length > 0)
                    setSelectedBranch(d.data[0].id);
            }
        })
            .catch(() => { });
    }, []);
    // Initialize Leaflet map
    useEffect(() => {
        if (!mapRef.current || leafletMap.current)
            return;
        getLeaflet().then((L) => {
            L.Icon.Default.prototype._getIconUrl = undefined;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });
            const map = L.map(mapRef.current, {
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
        if (!selectedBranch)
            return;
        api.admin.drivers.list(selectedBranch)
            .then((res) => setDrivers(res.data))
            .catch(() => { });
        api.admin.drivers.locations(selectedBranch)
            .then((res) => {
            const locs = new Map();
            const rows = Array.isArray(res.data) ? res.data : (res.data.rows ?? []);
            for (const row of rows) {
                locs.set(row.driver_id, row);
            }
            setDriverLocations(locs);
        })
            .catch(() => { });
    }, [selectedBranch]);
    // WebSocket for live updates
    useEffect(() => {
        if (!selectedBranch)
            return;
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
            }
            catch { }
        };
        ws.onerror = () => setError("WebSocket connection failed — showing last known locations");
        wsRef.current = ws;
        return () => { ws.close(); };
    }, [selectedBranch]);
    // Update map markers
    useEffect(() => {
        if (!leafletMap.current)
            return;
        getLeaflet().then((L) => {
            const driverMap = new Map(drivers.map((d) => [d.id, d]));
            for (const [driverId, loc] of driverLocations) {
                const lat = parseFloat(loc.lat);
                const lng = parseFloat(loc.lng);
                if (isNaN(lat) || isNaN(lng))
                    continue;
                const driver = driverMap.get(driverId);
                const name = loc.first_name
                    ? `${loc.first_name} ${loc.last_name}`.trim()
                    : driver
                        ? `${driver.firstName} ${driver.lastName}`.trim()
                        : "Driver";
                if (markers.current.has(driverId)) {
                    markers.current.get(driverId).setLatLng([lat, lng]);
                }
                else {
                    const icon = L.divIcon({
                        className: "",
                        html: `<div style="background:#2563eb;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>`,
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
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "border-b border-gray-200 bg-white px-8 py-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Driver Tracking" }), _jsx("p", { className: "text-sm text-gray-500", children: "Live driver locations \u2014 updates every 10 seconds" })] }), _jsx("select", { value: selectedBranch, onChange: (e) => setSelectedBranch(e.target.value), className: "rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none", children: branches.map((b) => (_jsx("option", { value: b.id, children: b.name }, b.id))) })] }), error && (_jsx("div", { className: "mt-3 rounded-xl bg-yellow-50 px-4 py-2 text-sm text-yellow-700", children: error }))] }), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsxs("div", { className: "w-64 flex-shrink-0 overflow-y-auto border-r border-gray-200 bg-white", children: [_jsx("div", { className: "px-4 py-3 border-b border-gray-100", children: _jsxs("p", { className: "text-xs font-semibold uppercase tracking-wide text-gray-400", children: [driverLocations.size, " active \u00B7 ", drivers.length, " total"] }) }), drivers.map((driver) => {
                                const loc = driverLocations.get(driver.id);
                                const isActive = !!loc;
                                return (_jsxs("div", { className: "flex items-center gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50 cursor-pointer", onClick: () => {
                                        if (loc && leafletMap.current) {
                                            leafletMap.current.setView([parseFloat(loc.lat), parseFloat(loc.lng)], 16);
                                        }
                                    }, children: [_jsxs("div", { className: `flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isActive ? "bg-brand-600" : "bg-gray-300"}`, children: [driver.firstName[0], driver.lastName?.[0] ?? ""] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "text-sm font-medium text-gray-900 truncate", children: [driver.firstName, " ", driver.lastName] }), _jsx("div", { className: `text-xs ${isActive ? "text-green-600" : "text-gray-400"}`, children: isActive ? "● Active" : "Offline" })] })] }, driver.id));
                            }), drivers.length === 0 && (_jsxs("div", { className: "px-4 py-8 text-center text-sm text-gray-400", children: ["No drivers for ", branchName] }))] }), _jsx("div", { ref: mapRef, className: "flex-1" })] })] }));
}
//# sourceMappingURL=Drivers.js.map