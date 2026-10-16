"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";

/**
 * The one place Leaflet is imported.
 *
 * Nothing outside this file (and its dynamic wrapper) knows which mapping
 * library is in use. Pins are drawn as inline-styled `divIcon`s rather than
 * Leaflet's default image markers, which also removes the classic bundler
 * problem of the default icon URLs not resolving.
 */

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

export type MapPoint = { latitude: number; longitude: number };

export type LeafletMapProps = {
  destination?: MapPoint & { label?: string; approximate?: boolean };
  origin?: MapPoint | null;
  /** GeoJSON order: [longitude, latitude]. */
  route?: [number, number][] | null;
  /** Picker mode: clicking or dragging moves the destination. */
  onDestinationChange?: (point: MapPoint) => void;
  className?: string;
  placeholder?: boolean;
};

function pinIcon({ approximate }: { approximate: boolean }): L.DivIcon {
  // Inline styles keep the pin identical regardless of stylesheet load order.
  const fill = approximate ? "#ffffff" : "#5b3df5";
  const stroke = approximate ? "#5b3df5" : "#ffffff";

  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:9999px 9999px 9999px 2px;transform:rotate(-45deg);background:${fill};border:3px solid ${stroke};box-shadow:0 6px 14px rgba(11,16,32,0.35);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function originIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2f6bff;border:4px solid #ffffff;box-shadow:0 4px 12px rgba(11,16,32,0.35);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Keeps the viewport framed as the worker's position or the pin changes. */
function Viewport({ destination, origin }: { destination: MapPoint; origin?: MapPoint | null }) {
  const map = useMap();

  useEffect(() => {
    if (origin) {
      const bounds = L.latLngBounds(
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      return;
    }

    map.setView([destination.latitude, destination.longitude], 15, { animate: false });
  }, [map, destination, origin]);

  return null;
}

function ClickToPlace({ onPlace }: { onPlace: (point: MapPoint) => void }) {
  useMapEvents({
    click(event) {
      onPlace({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function LeafletMap({
  destination,
  origin,
  route,
  onDestinationChange,
  className,
  placeholder = false,
}: LeafletMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);

  const safeDestination = destination ?? {
    latitude: 9.082,
    longitude: 8.6753,
    label: "Nigeria",
    approximate: false,
  };

  const icon = useMemo(
    () => pinIcon({ approximate: Boolean(safeDestination.approximate) }),
    [safeDestination.approximate],
  );
  const draggable = Boolean(onDestinationChange);

  return (
    <div className={className}>
      {tilesFailed ? (
        <p
          role="status"
          className="mb-2 rounded-xl border border-[#E2E3EC] bg-[#F4F5F8] px-3 py-2 text-xs text-[#5B6178]"
        >
          Map images could not load — the connection may be weak. The address, coordinates and directions below still
          work.
        </p>
      ) : null}

      <MapContainer
        center={[safeDestination.latitude, safeDestination.longitude]}
        zoom={placeholder ? 6 : 15}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: "100%", width: "100%", borderRadius: "16px", zIndex: 0 }}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          eventHandlers={{ tileerror: () => setTilesFailed(true) }}
        />

        <Viewport destination={safeDestination} origin={origin ?? null} />

        {onDestinationChange ? <ClickToPlace onPlace={onDestinationChange} /> : null}

        {route && route.length > 1 ? (
          <Polyline
            positions={route.map(([longitude, latitude]) => [latitude, longitude] as [number, number])}
            pathOptions={{ color: "#5b3df5", weight: 5, opacity: 0.85 }}
          />
        ) : null}

        {origin ? <Marker position={[origin.latitude, origin.longitude]} icon={originIcon()} /> : null}

        {!placeholder ? (
          <Marker
            position={[safeDestination.latitude, safeDestination.longitude]}
            icon={icon}
            draggable={draggable}
            eventHandlers={
              draggable
                ? {
                    dragend(event) {
                      const { lat, lng } = event.target.getLatLng();
                      onDestinationChange?.({ latitude: lat, longitude: lng });
                    },
                  }
                : undefined
            }
          >
            <Popup>
              <span className="block text-sm font-semibold text-[#0B1020]">{safeDestination.label}</span>
              {safeDestination.approximate ? (
                <span className="mt-1 block text-xs text-[#5B6178]">
                  Approximate pin — confirm the entrance locally.
                </span>
              ) : null}
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
