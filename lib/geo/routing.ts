import { type Coordinates } from "@/lib/geo/coordinates";

/**
 * Routing behind a provider interface.
 *
 * The default points at the public OSRM demo server, which is fine for a
 * handful of previews but is explicitly *not* capacity for production traffic.
 * A deployment should point `ROUTING_BASE_URL` at its own OSRM instance (or set
 * `ROUTING_PROVIDER=none`), and swapping in a hosted provider means adding one
 * implementation of `RoutingProvider` and returning it from
 * `getRoutingProvider` — no interface changes elsewhere.
 */

const REQUEST_TIMEOUT_MS = 9_000;
const OSRM_DEMO_BASE_URL = "https://router.project-osrm.org";

export type RouteGeometry = {
  type: "LineString";
  /** GeoJSON order: [longitude, latitude]. */
  coordinates: [number, number][];
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry | null;
  provider: string;
  attribution: string;
};

export type RouteFailureReason = "disabled" | "unavailable" | "timeout" | "no_route";

export type RouteOutcome =
  | { ok: true; route: RouteResult }
  | { ok: false; reason: RouteFailureReason; message: string };

export interface RoutingProvider {
  id: string;
  attribution: string;
  route(from: Coordinates, to: Coordinates): Promise<RouteOutcome>;
}

function failure(reason: RouteFailureReason, message: string): RouteOutcome {
  return { ok: false, reason, message };
}

const osrmProvider: RoutingProvider = {
  id: "osrm",
  attribution: "Routing by OSRM, data © OpenStreetMap contributors",
  async route(from, to) {
    const base = (process.env.ROUTING_BASE_URL?.trim() || OSRM_DEMO_BASE_URL).replace(/\/$/, "");
    const path = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const url = `${base}/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        return failure("unavailable", "The routing service did not answer. You can still open the venue in your maps app.");
      }

      const payload = (await response.json()) as {
        code?: string;
        routes?: { distance?: number; duration?: number; geometry?: RouteGeometry }[];
      };

      if (payload.code && payload.code !== "Ok") {
        return failure("no_route", "No driving route was found to this venue. Try your maps app, which may know local roads.");
      }

      const route = payload.routes?.[0];
      if (!route || typeof route.distance !== "number" || typeof route.duration !== "number") {
        return failure("unavailable", "The routing service returned an unusable answer.");
      }

      const geometry =
        route.geometry && Array.isArray(route.geometry.coordinates) && route.geometry.coordinates.length > 1
          ? route.geometry
          : null;

      return {
        ok: true,
        route: {
          distanceMeters: route.distance,
          durationSeconds: route.duration,
          geometry,
          provider: "osrm",
          attribution: osrmProvider.attribution,
        },
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return failure("timeout", "The routing service took too long to answer. Try again, or open the venue in your maps app.");
      }
      console.error("Routing request failed:", error);
      return failure("unavailable", "We could not reach the routing service. Your venue details are unaffected.");
    } finally {
      clearTimeout(timeout);
    }
  },
};

const disabledProvider: RoutingProvider = {
  id: "none",
  attribution: "",
  async route() {
    return failure("disabled", "Route previews are turned off for this deployment. Use the directions links instead.");
  },
};

export function getRoutingProvider(): RoutingProvider {
  const configured = (process.env.ROUTING_PROVIDER?.trim() || "osrm").toLowerCase();
  return configured === "none" ? disabledProvider : osrmProvider;
}

/**
 * Reports whether the configured provider is one that can be relied on for
 * production traffic, so the interface can avoid promising more than it does.
 */
export function usesSharedDemoRouting(): boolean {
  const provider = getRoutingProvider();
  if (provider.id === "none") return false;
  return !process.env.ROUTING_BASE_URL?.trim();
}
