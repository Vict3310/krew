"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import { toCoordinates } from "@/lib/geo/coordinates";

/**
 * The public face of the map.
 *
 * Leaflet only exists in the browser and is code-split behind this wrapper, so
 * the mapping library never enters the server render or the initial bundle of a
 * page that has no map on it. When a venue has no confirmed coordinates this
 * renders an honest panel instead of a map centred on a guess.
 */

const LeafletMap = dynamic(() => import("@/components/venue/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-2xl border border-[#E6E7EF] bg-[#F4F5F8]">
      <span className="text-sm text-[#5B6178]">Loading map…</span>
    </div>
  ),
});

export type VenueMapProps = {
  destination: { latitude: number | null; longitude: number | null; label: string; approximate?: boolean };
  origin?: { latitude: number; longitude: number } | null;
  route?: [number, number][] | null;
  onDestinationChange?: (point: { latitude: number; longitude: number }) => void;
  className?: string;
  emptyMessage?: string;
};

export default function VenueMap({
  destination,
  origin,
  route,
  onDestinationChange,
  className = "h-72",
  emptyMessage = "This venue does not have confirmed coordinates yet.",
}: VenueMapProps) {
  const coordinates = toCoordinates(destination.latitude, destination.longitude);

  if (!coordinates) {
    return (
      <div className={`${className} relative overflow-hidden rounded-2xl border border-[#E2E3EC] bg-[#F4F5F8]`}>
        <LeafletMap
          destination={{ latitude: 9.082, longitude: 8.6753, label: "Nigeria" }}
          origin={origin ?? null}
          route={route ?? null}
          onDestinationChange={onDestinationChange}
          className="h-full w-full"
          placeholder
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-center shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-sm text-[#5B6178]">
            <MapPin className="h-4 w-4 text-[#8A90A6]" aria-hidden="true" />
            <span>{emptyMessage}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8A90A6]">
            Krew never guesses a position, so no pin is shown until someone confirms the location.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <LeafletMap
        destination={{ ...coordinates, label: destination.label, approximate: destination.approximate }}
        origin={origin ?? null}
        route={route ?? null}
        onDestinationChange={onDestinationChange}
        className="h-full w-full"
      />
    </div>
  );
}
