import { isValidLatitude, isValidLongitude, isWithinNigeria, type Coordinates } from "@/lib/geo/coordinates";

/**
 * Geocoding through a Nominatim-compatible service.
 *
 * Nominatim's usage policy requires an identifying User-Agent, at most one
 * request per second, and client-side caching — this module enforces all three
 * rather than hoping callers remember. A different provider can be swapped in by
 * pointing `GEOCODING_BASE_URL` at it.
 *
 * Nothing here is used to invent a venue position. Results are candidates that
 * an organizer must confirm, and a failed lookup returns no coordinates at all.
 */

const DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
const REQUEST_TIMEOUT_MS = 9_000;
const MIN_INTERVAL_MS = 1_100;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_LIMIT = 200;

export type GeocodePlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  /** A hint for the organizer, not a filter: pins outside Nigeria stay usable. */
  withinNigeria: boolean;
};

export type GeocodeOutcome =
  | { ok: true; places: GeocodePlace[] }
  | { ok: false; reason: "unavailable" | "timeout" | "rate_limited"; message: string };

type CacheEntry = { expiresAt: number; outcome: GeocodeOutcome };

const cache = new Map<string, CacheEntry>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function baseUrl(): string {
  return (process.env.GEOCODING_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

/**
 * Nominatim asks for a User-Agent that identifies the application. The default
 * carries the app name and its public URL; deployments should set their own.
 */
function userAgent(): string {
  return (
    process.env.GEOCODING_USER_AGENT?.trim() ||
    `Krew/0.1 (+${process.env.APP_URL?.trim() || "https://krew.ng"})`
  );
}

function readCache(key: string): GeocodeOutcome | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.outcome;
}

function writeCache(key: string, outcome: GeocodeOutcome): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, outcome });
}

/** Serialises requests so we never exceed one call per second. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });

  // Keep the chain alive even when a task rejects.
  queue = run.catch(() => undefined);
  return run;
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent(),
        Accept: "application/json",
        "Accept-Language": "en-NG,en;q=0.8",
      },
      cache: "no-store",
    });

    if (response.status === 429 || response.status === 403) {
      throw Object.assign(new Error("geocoder rate limited"), { reason: "rate_limited" as const });
    }

    if (!response.ok) {
      throw Object.assign(new Error(`geocoder responded ${response.status}`), {
        reason: "unavailable" as const,
      });
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function toPlace(raw: Record<string, unknown>): GeocodePlace | null {
  const latitude = Number.parseFloat(String(raw.lat));
  const longitude = Number.parseFloat(String(raw.lon));

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) return null;

  const address = typeof raw.display_name === "string" ? raw.display_name : "";
  const named = raw.namedetails as { name?: unknown } | undefined;
  const name =
    (typeof named?.name === "string" && named.name.trim()) ||
    (typeof raw.name === "string" && raw.name.trim()) ||
    address.split(",")[0]?.trim() ||
    "Unnamed location";

  const coordinates: Coordinates = { latitude, longitude };

  return {
    id: String(raw.place_id ?? `${latitude},${longitude}`),
    name,
    address: address || name,
    latitude,
    longitude,
    category: [raw.class, raw.type].filter((value) => typeof value === "string").join(" · "),
    withinNigeria: isWithinNigeria(coordinates),
  };
}

/** Forward geocoding: search a venue name, landmark or address. */
export async function searchPlaces(
  query: string,
  options: { limit?: number; countryCodes?: string } = {},
): Promise<GeocodeOutcome> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { ok: true, places: [] };
  }

  const limit = Math.min(Math.max(options.limit ?? 5, 1), 10);
  const countryCodes = options.countryCodes ?? "ng";
  const key = `search:${countryCodes}:${limit}:${trimmed.toLowerCase()}`;

  const cached = readCache(key);
  if (cached) return cached;

  const url = `${baseUrl()}/search?format=jsonv2&addressdetails=1&namedetails=1&limit=${limit}&countrycodes=${encodeURIComponent(countryCodes)}&q=${encodeURIComponent(trimmed)}`;

  try {
    const payload = await enqueue(() => fetchJson(url));
    const rows = Array.isArray(payload) ? payload : [];
    const outcome: GeocodeOutcome = {
      ok: true,
      places: rows
        .filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
        .map(toPlace)
        .filter((place): place is GeocodePlace => place !== null),
    };

    writeCache(key, outcome);
    return outcome;
  } catch (error) {
    const reason = (error as { reason?: string }).reason === "rate_limited" ? "rate_limited" : ((error as Error).name === "AbortError" ? "timeout" : "unavailable");
    console.error("Geocoding search failed:", error);
    return {
      ok: false,
      reason,
      message:
        reason === "rate_limited"
          ? "The map search service is rate limiting us. Wait a moment and try again, or place the pin manually."
          : "We could not reach the map search service. You can still place the pin manually on the map.",
    };
  }
}

/** Reverse geocoding: turn a manually placed pin into a readable address. */
export async function reverseGeocode(coordinates: Coordinates): Promise<GeocodeOutcome> {
  const key = `reverse:${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`;

  const cached = readCache(key);
  if (cached) return cached;

  const url = `${baseUrl()}/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${coordinates.latitude}&lon=${coordinates.longitude}`;

  try {
    const payload = await enqueue(() => fetchJson(url));
    const place =
      typeof payload === "object" && payload !== null ? toPlace(payload as Record<string, unknown>) : null;
    const outcome: GeocodeOutcome = { ok: true, places: place ? [place] : [] };

    writeCache(key, outcome);
    return outcome;
  } catch (error) {
    const reason = (error as { reason?: string }).reason === "rate_limited" ? "rate_limited" : ((error as Error).name === "AbortError" ? "timeout" : "unavailable");
    console.error("Reverse geocoding failed:", error);
    return {
      ok: false,
      reason,
      message: "We could not look up an address for that spot. You can still save the pin and add the address yourself.",
    };
  }
}
