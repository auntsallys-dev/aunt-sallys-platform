import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks = [];
function loadGoogleMaps(callback) {
    if (mapsLoaded) {
        callback();
        return;
    }
    mapsCallbacks.push(callback);
    if (mapsLoading)
        return;
    mapsLoading = true;
    if (!MAPS_KEY) {
        // No API key — skip Maps loading
        mapsLoaded = true;
        mapsCallbacks.forEach((cb) => cb());
        mapsCallbacks.length = 0;
        return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
        mapsLoaded = true;
        mapsCallbacks.forEach((cb) => cb());
        mapsCallbacks.length = 0;
    };
    document.head.appendChild(script);
}
// Map pin modal
function MapPinModal({ addressLine, lat, lng, onConfirm, onClose, }) {
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [currentLat, setCurrentLat] = useState(lat);
    const [currentLng, setCurrentLng] = useState(lng);
    useEffect(() => {
        if (!mapRef.current || !window.google)
            return;
        const google = window.google;
        const map = new google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom: 17,
            mapTypeControl: false,
            streetViewControl: false,
        });
        const marker = new google.maps.Marker({
            position: { lat, lng },
            map,
            draggable: true,
            title: "Drag to adjust",
        });
        markerRef.current = marker;
        marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            setCurrentLat(pos.lat());
            setCurrentLng(pos.lng());
        });
    }, [lat, lng]);
    return (_jsx("div", { className: "fixed inset-0 z-[60] flex items-center justify-center bg-black/50", children: _jsxs("div", { className: "w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b border-gray-100", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-base font-bold text-gray-900", children: "Confirm Location" }), _jsx("p", { className: "text-xs text-gray-500 truncate max-w-xs", children: addressLine })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 text-xl", children: "\u00D7" })] }), _jsx("div", { ref: mapRef, className: "h-72 w-full" }), _jsxs("div", { className: "px-5 py-4", children: [_jsx("p", { className: "mb-3 text-xs text-gray-500", children: "Drag the pin to the exact location." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: onClose, className: "flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50", children: "Cancel" }), _jsx("button", { onClick: () => onConfirm(currentLat, currentLng), className: "flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700", children: "Confirm Pin" })] })] })] }) }));
}
export function AddressInput({ value, onChange, placeholder = "Search address…", className = "" }) {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [showMapPin, setShowMapPin] = useState(false);
    const [pinData, setPinData] = useState(null);
    const [latLng, setLatLng] = useState({ lat: null, lng: null });
    useEffect(() => {
        loadGoogleMaps(() => setReady(true));
    }, []);
    useEffect(() => {
        if (!ready || !MAPS_KEY || !inputRef.current || autocompleteRef.current)
            return;
        const google = window.google;
        if (!google?.maps?.places)
            return;
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
            componentRestrictions: { country: "ph" },
            fields: ["formatted_address", "geometry"],
        });
        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const addressLine = place.formatted_address ?? inputRef.current?.value ?? "";
            const lat = place.geometry?.location?.lat() ?? null;
            const lng = place.geometry?.location?.lng() ?? null;
            if (lat !== null && lng !== null) {
                setPinData({ addressLine, lat, lng });
                setShowMapPin(true);
            }
            else {
                setLatLng({ lat: null, lng: null });
                onChange({ addressLine, lat: null, lng: null });
            }
        });
        autocompleteRef.current = autocomplete;
    }, [ready]);
    function handleManualChange(e) {
        setLatLng({ lat: null, lng: null });
        onChange({ addressLine: e.target.value, lat: null, lng: null });
    }
    function handlePinConfirm(lat, lng) {
        if (!pinData)
            return;
        setLatLng({ lat, lng });
        setShowMapPin(false);
        onChange({ addressLine: pinData.addressLine, lat, lng });
    }
    const hasPin = latLng.lat !== null;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative", children: [_jsx("input", { ref: inputRef, type: "text", defaultValue: value, onChange: handleManualChange, placeholder: placeholder, className: `${className} pr-8` }), hasPin && (_jsx("button", { type: "button", onClick: () => pinData && setShowMapPin(true), className: "absolute right-2 top-1/2 -translate-y-1/2 text-green-500 text-sm", title: "Location pinned", children: "\uD83D\uDCCD" }))] }), showMapPin && pinData && (_jsx(MapPinModal, { addressLine: pinData.addressLine, lat: pinData.lat, lng: pinData.lng, onConfirm: handlePinConfirm, onClose: () => setShowMapPin(false) }))] }));
}
//# sourceMappingURL=AddressInput.js.map