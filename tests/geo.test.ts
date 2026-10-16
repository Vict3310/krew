import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatCoordinates,
  hasConfirmedVenueCoordinates,
  hasVenueCoordinates,
  isWithinNigeria,
  parseCoordinatePair,
  toCoordinates,
  venueCoordinates,
} from "@/lib/geo/coordinates";
import { formatDistance, formatDuration, haversineMeters } from "@/lib/geo/distance";
import { buildNavigationLinks, buildSearchLink } from "@/lib/geo/navigation";
import { getRoutingProvider, usesSharedDemoRouting } from "@/lib/geo/routing";

const LAGOS = { latitude: 6.455, longitude: 3.3841 };
const ABUJA = { latitude: 9.0765, longitude: 7.3986 };

describe("coordinate validation", () => {
  it("accepts a real pair", () => {
    expect(toCoordinates(6.455, 3.3841)).toEqual({ latitude: 6.455, longitude: 3.3841 });
    expect(toCoordinates(0, 0)).toEqual({ latitude: 0, longitude: 0 });
  });

  it("rejects out-of-range, missing and non-numeric values", () => {
    expect(toCoordinates(91, 3)).toBeNull();
    expect(toCoordinates(-91, 3)).toBeNull();
    expect(toCoordinates(6, 181)).toBeNull();
    expect(toCoordinates(null, 3)).toBeNull();
    expect(toCoordinates(Number.NaN, 3)).toBeNull();
    expect(toCoordinates(Number.POSITIVE_INFINITY, 3)).toBeNull();
    expect(toCoordinates("6.4", 3)).toBeNull();
  });

  it("parses the 'lat,lon' link form and refuses anything else", () => {
    expect(parseCoordinatePair("6.42810,3.42190")).toEqual({ latitude: 6.4281, longitude: 3.4219 });
    expect(parseCoordinatePair("6.42810")).toBeNull();
    expect(parseCoordinatePair("")).toBeNull();
    expect(parseCoordinatePair(null)).toBeNull();
    expect(parseCoordinatePair("north,west")).toBeNull();
  });

  it("treats a half-filled pair as no location at all", () => {
    expect(hasVenueCoordinates({ latitude: 6.4, longitude: null })).toBe(false);
    expect(hasVenueCoordinates({ latitude: null, longitude: 3.4 })).toBe(false);
    expect(hasVenueCoordinates({})).toBe(false);
    expect(hasVenueCoordinates({ latitude: 6.4, longitude: 3.4 })).toBe(true);
    expect(venueCoordinates({ latitude: 6.4, longitude: null })).toBeNull();
  });

  it("requires an explicit venue confirmation before treating a pin as saved", () => {
    expect(hasConfirmedVenueCoordinates({ latitude: 6.4, longitude: 3.4, locationPrecision: "" })).toBe(false);
    expect(hasConfirmedVenueCoordinates({ latitude: 6.4, longitude: 3.4, locationPrecision: "APPROXIMATE" })).toBe(true);
    expect(hasConfirmedVenueCoordinates({ latitude: 6.4, longitude: 3.4, locationPrecision: "EXACT" })).toBe(true);
    expect(hasConfirmedVenueCoordinates({ latitude: 6.4, longitude: null, locationPrecision: "APPROXIMATE" })).toBe(false);
  });

  it("recognises Nigerian coordinates without rejecting others", () => {
    expect(isWithinNigeria(LAGOS)).toBe(true);
    expect(isWithinNigeria({ latitude: 51.5072, longitude: -0.1276 })).toBe(false);
  });

  it("formats coordinates to a stable width for links", () => {
    expect(formatCoordinates(LAGOS)).toBe("6.45500,3.38410");
    expect(formatCoordinates(LAGOS, 2)).toBe("6.46,3.38");
  });
});

describe("distance", () => {
  it("measures the great-circle distance between two cities", () => {
    const metres = haversineMeters(LAGOS, ABUJA);
    expect(metres).toBeGreaterThan(500_000);
    expect(metres).toBeLessThan(560_000);
  });

  it("is zero for the same point and symmetric", () => {
    expect(haversineMeters(LAGOS, LAGOS)).toBe(0);
    expect(haversineMeters(LAGOS, ABUJA)).toBeCloseTo(haversineMeters(ABUJA, LAGOS), 6);
  });

  it("formats distances in metres and kilometres", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(824)).toBe("820 m");
    expect(formatDistance(4_260)).toBe("4.3 km");
    expect(formatDistance(112_400)).toBe("112 km");
    expect(formatDistance(Number.NaN)).toBe("unknown distance");
  });

  it("formats only real durations", () => {
    expect(formatDuration(480)).toBe("8 min");
    expect(formatDuration(3_900)).toBe("1 h 5 min");
    expect(formatDuration(3_600)).toBe("1 h");
    expect(formatDuration(-1)).toBe("unknown duration");
  });
});

describe("external navigation links", () => {
  it("offers device, OpenStreetMap and Google targets with real coordinates", () => {
    const links = buildNavigationLinks(LAGOS, { label: "Eko Hotel" });
    expect(links.map((link) => link.id)).toEqual(["device", "openstreetmap", "google"]);
    // The primary action hands off to the device's own maps app.
    expect(links[0].label).toBe("Navigate to venue");
    expect(links[1].label).toBe("Open in maps");
    expect(links[0].href).toContain("geo:6.45500,3.38410");
    expect(links[1].href).toContain("openstreetmap.org/directions");
    expect(links[1].href).toContain("6.455");
    expect(links[2].href).toContain("google.com/maps/dir");
  });

  it("offers nothing when the venue has no coordinates", () => {
    expect(buildNavigationLinks(null)).toEqual([]);
  });

  it("builds a search link only for a usable query", () => {
    expect(buildSearchLink("Eko Hotel, Lagos")).toContain("openstreetmap.org/search");
    expect(buildSearchLink("ab")).toBeNull();
  });
});

describe("routing provider", () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.ROUTING_BASE_URL;
  const originalProvider = process.env.ROUTING_PROVIDER;

  beforeEach(() => {
    process.env.ROUTING_BASE_URL = "http://routing.test";
    delete process.env.ROUTING_PROVIDER;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.ROUTING_BASE_URL;
    else process.env.ROUTING_BASE_URL = originalBaseUrl;
    if (originalProvider === undefined) delete process.env.ROUTING_PROVIDER;
    else process.env.ROUTING_PROVIDER = originalProvider;
    vi.restoreAllMocks();
  });

  it("parses a successful OSRM response", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 12_345.6,
              duration: 1_200,
              geometry: { type: "LineString", coordinates: [[3.38, 6.45], [3.42, 6.43]] },
            },
          ],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.route.distanceMeters).toBeCloseTo(12_345.6);
    expect(outcome.route.durationSeconds).toBe(1_200);
    expect(outcome.route.geometry?.coordinates).toHaveLength(2);
    expect(outcome.route.attribution).toContain("OpenStreetMap");
  });

  it("reports an unroutable answer as no_route rather than a distance", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: "NoRoute", routes: [] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("no_route");
  });

  it("reports a failing service as unavailable", async () => {
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 502 })) as unknown as typeof fetch;

    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("unavailable");
  });

  it("returns an unusable payload as unavailable instead of inventing a route", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ code: "Ok", routes: [{}] }), { status: 200 }),
    ) as unknown as typeof fetch;

    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(false);
  });

  it("reports a timeout when the request is aborted", async () => {
    globalThis.fetch = vi.fn(async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch;

    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("timeout");
  });

  it("can be switched off entirely for a deployment", async () => {
    process.env.ROUTING_PROVIDER = "none";
    const outcome = await getRoutingProvider().route(LAGOS, ABUJA);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("disabled");
  });

  it("flags when routing falls back to the shared public demo service", () => {
    expect(usesSharedDemoRouting()).toBe(false);
    delete process.env.ROUTING_BASE_URL;
    expect(usesSharedDemoRouting()).toBe(true);
  });
});
