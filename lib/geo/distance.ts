import type { Coordinates } from "@/lib/geo/coordinates";

const EARTH_RADIUS_METRES = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle (as-the-crow-flies) distance in metres.
 *
 * This is deliberately *not* presented as travel distance anywhere in the
 * interface: it is the honest label for "how far away is this venue", while
 * routed distance comes from the routing service or not at all.
 */
export function haversineMeters(from: Coordinates, to: Coordinates): number {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const latitudeA = toRadians(from.latitude);
  const latitudeB = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "820 m" / "4.3 km" / "112 km" — readable on a phone at a glance. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "unknown distance";
  if (meters < 950) return `${Math.round(meters / 10) * 10} m`;
  if (meters < 100_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/** "8 min" / "1 h 5 min" — only used for durations a routing service returned. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown duration";

  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
