import { formatCoordinates, type Coordinates } from "@/lib/geo/coordinates";

export type NavigationLink = {
  id: "openstreetmap" | "google" | "device";
  label: string;
  description: string;
  href: string;
};

/**
 * External navigation targets for a confirmed venue.
 *
 * Returns an empty list when the venue has no usable coordinates, so the caller
 * cannot accidentally offer "navigate" to a place we do not actually know.
 * `geo:` hands off to whichever navigation app the device has installed, which
 * is what keeps the worker's app choice theirs.
 */
export function buildNavigationLinks(
  coordinates: Coordinates | null,
  options: { label?: string } = {},
): NavigationLink[] {
  if (!coordinates) return [];

  const pair = formatCoordinates(coordinates);
  const label = options.label?.trim();

  return [
    // The primary action: hands the pin to whichever maps app the device has,
    // so the worker's app choice stays theirs.
    {
      id: "device",
      label: "Navigate to venue",
      description: "Opens the maps app you already use",
      href: label ? `geo:${pair}?q=${pair}(${encodeURIComponent(label)})` : `geo:${pair}?q=${pair}`,
    },
    {
      id: "openstreetmap",
      label: "Open in maps",
      description: "OpenStreetMap directions in a new tab",
      href: `https://www.openstreetmap.org/directions?to=${encodeURIComponent(pair)}#map=17/${coordinates.latitude}/${coordinates.longitude}`,
    },
    {
      id: "google",
      label: "Google Maps",
      description: "If you prefer Google's directions",
      href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pair)}`,
    },
  ];
}

/** Region-level OpenStreetMap link used when only a venue name is known. */
export function buildSearchLink(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(trimmed)}`;
}
