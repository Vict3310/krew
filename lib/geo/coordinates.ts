/**
 * Coordinate types and validation.
 *
 * Nothing here invents a position: every helper either accepts a real pair of
 * numbers or returns `null`, so callers are forced to handle "we do not know
 * where this venue is" instead of rendering a fake pin.
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * A generous bounding box around Nigeria. Used to *warn* an organizer that a
 * confirmed pin looks wrong, never to reject their input: venues near a border,
 * and organizers planning abroad, are legitimate.
 */
export const NIGERIA_BOUNDS = {
  minLatitude: 4.2,
  maxLatitude: 13.9,
  minLongitude: 2.6,
  maxLongitude: 14.7,
} as const;

export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Returns a validated pair, or `null` when either value is unusable. */
export function toCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;
  return { latitude, longitude };
}

/** Parses the `"6.4281,3.4219"` form used by links and query strings. */
export function parseCoordinatePair(value: string | null | undefined): Coordinates | null {
  if (!value) return null;

  const [rawLatitude, rawLongitude] = value.split(",");
  if (rawLatitude === undefined || rawLongitude === undefined) return null;

  const latitude = Number.parseFloat(rawLatitude);
  const longitude = Number.parseFloat(rawLongitude);

  return toCoordinates(latitude, longitude);
}

export function isWithinNigeria(coordinates: Coordinates): boolean {
  return (
    coordinates.latitude >= NIGERIA_BOUNDS.minLatitude &&
    coordinates.latitude <= NIGERIA_BOUNDS.maxLatitude &&
    coordinates.longitude >= NIGERIA_BOUNDS.minLongitude &&
    coordinates.longitude <= NIGERIA_BOUNDS.maxLongitude
  );
}

/** Fixed-width form for URLs so links stay stable and comparable. */
export function formatCoordinates(coordinates: Coordinates, precision = 5): string {
  return `${coordinates.latitude.toFixed(precision)},${coordinates.longitude.toFixed(precision)}`;
}

/** Anything with the two optional venue columns from the Shift model. */
export type VenueCoordinatesSource = {
  latitude?: number | null;
  longitude?: number | null;
  locationPrecision?: "EXACT" | "APPROXIMATE" | "" | null;
};

/** True only when the record actually carries a usable, confirmed position. */
export function hasVenueCoordinates(source: VenueCoordinatesSource): boolean {
  return toCoordinates(source.latitude ?? null, source.longitude ?? null) !== null;
}

/** A pin is only saved after the organizer explicitly confirms the location. */
export function hasConfirmedVenueCoordinates(source: VenueCoordinatesSource): boolean {
  if (!hasVenueCoordinates(source)) return false;
  return source.locationPrecision === "EXACT" || source.locationPrecision === "APPROXIMATE";
}

export function venueCoordinates(source: VenueCoordinatesSource): Coordinates | null {
  return toCoordinates(source.latitude ?? null, source.longitude ?? null);
}
