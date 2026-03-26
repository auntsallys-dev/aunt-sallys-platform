import { useState, useEffect, useRef, useCallback } from "react";

export interface AddressResult {
  addressLine: string;
  lat: number | null;
  lng: number | null;
}

interface AddressInputProps {
  value: string;
  onChange: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(callback: () => void) {
  if (mapsLoaded) { callback(); return; }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
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
function MapPinModal({
  addressLine,
  lat,
  lng,
  onConfirm,
  onClose,
}: {
  addressLine: string;
  lat: number;
  lng: number;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const [currentLat, setCurrentLat] = useState(lat);
  const [currentLng, setCurrentLng] = useState(lng);

  useEffect(() => {
    if (!mapRef.current || !(window as any).google) return;

    const google = (window as any).google;
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Confirm Location</h3>
            <p className="text-xs text-gray-500 truncate max-w-xs">{addressLine}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div ref={mapRef} className="h-72 w-full" />
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-gray-500">Drag the pin to the exact location.</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(currentLat, currentLng)}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Confirm Pin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AddressInput({ value, onChange, placeholder = "Search address…", className = "" }: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [showMapPin, setShowMapPin] = useState(false);
  const [pinData, setPinData] = useState<{ addressLine: string; lat: number; lng: number } | null>(null);
  const [latLng, setLatLng] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    loadGoogleMaps(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !MAPS_KEY || !inputRef.current || autocompleteRef.current) return;

    const google = (window as any).google;
    if (!google?.maps?.places) return;

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
      } else {
        setLatLng({ lat: null, lng: null });
        onChange({ addressLine, lat: null, lng: null });
      }
    });

    autocompleteRef.current = autocomplete;
  }, [ready]);

  function handleManualChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLatLng({ lat: null, lng: null });
    onChange({ addressLine: e.target.value, lat: null, lng: null });
  }

  function handlePinConfirm(lat: number, lng: number) {
    if (!pinData) return;
    setLatLng({ lat, lng });
    setShowMapPin(false);
    onChange({ addressLine: pinData.addressLine, lat, lng });
  }

  const hasPin = latLng.lat !== null;

  return (
    <>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={handleManualChange}
          placeholder={placeholder}
          className={`${className} pr-8`}
        />
        {hasPin && (
          <button
            type="button"
            onClick={() => pinData && setShowMapPin(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 text-sm"
            title="Location pinned"
          >
            📍
          </button>
        )}
      </div>

      {showMapPin && pinData && (
        <MapPinModal
          addressLine={pinData.addressLine}
          lat={pinData.lat}
          lng={pinData.lng}
          onConfirm={handlePinConfirm}
          onClose={() => setShowMapPin(false)}
        />
      )}
    </>
  );
}
