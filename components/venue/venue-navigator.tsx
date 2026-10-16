"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Loader2,
  LocateFixed,
  Navigation,
  Route,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import VenueMap from "@/components/venue/venue-map";
import { haversineMeters, formatDistance, formatDuration } from "@/lib/geo/distance";
import { toCoordinates } from "@/lib/geo/coordinates";
import { buildNavigationLinks } from "@/lib/geo/navigation";

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "ready"; latitude: number; longitude: number }
  | { status: "error"; message: string };

type RouteState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      distanceMeters: number;
      durationSeconds: number;
      geometry: [number, number][] | null;
      attribution: string;
      sharedDemoRouting: boolean;
    }
  | { status: "error"; message: string; retryable: boolean };

export type VenueNavigatorProps = {
  assignmentId: string;
  routeEnabled: boolean;
  venue: {
    title: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    approximate: boolean;
  };
};

const GEOLOCATION_TIMEOUT_MS = 10_000;

export default function VenueNavigator({ assignmentId, routeEnabled, venue }: VenueNavigatorProps) {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [route, setRoute] = useState<RouteState>({ status: "idle" });

  const destination = toCoordinates(venue.latitude, venue.longitude);
  const origin = geo.status === "ready" ? { latitude: geo.latitude, longitude: geo.longitude } : null;
  const links = buildNavigationLinks(destination, { label: venue.name });
  const navigateLink = links.find((link) => link.id === "device") ?? null;
  const mapLinks = links.filter((link) => link.id !== "device");

  const straightLineMeters = destination && origin ? haversineMeters(origin, destination) : null;

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "error", message: "This device or browser cannot share a location. You can still use the directions links." });
      return;
    }

    setGeo({ status: "requesting" });
    setRoute({ status: "idle" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          status: "ready",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was declined. You can keep viewing the venue and use the directions links — nothing is blocked."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your device could not get a location fix. If you are indoors, step outside or near a window and try again."
              : "Getting your location took too long. Try again, or use the directions links.";

        setGeo({ status: "error", message });
      },
      { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60_000 },
      // `maximumAge` keeps a recent fix reusable; this is a one-off read, never
      // a subscription, so nothing is tracked while the worker uses the app.
    );
  }

  async function loadRoute() {
    if (!origin) return;

    setRoute({ status: "loading" });

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: origin }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            reason?: string;
            route?: {
              distanceMeters: number;
              durationSeconds: number;
              geometry: { coordinates: [number, number][] } | null;
              attribution: string;
            };
            sharedDemoRouting?: boolean;
          }
        | null;

      if (!response.ok || !payload?.ok || !payload.route) {
        setRoute({
          status: "error",
          message: payload?.message ?? "We could not calculate a route just now. The venue pin and directions links still work.",
          retryable: payload?.reason !== "no_venue_coordinates",
        });
        return;
      }

      setRoute({
        status: "ready",
        distanceMeters: payload.route.distanceMeters,
        durationSeconds: payload.route.durationSeconds,
        geometry: payload.route.geometry?.coordinates ?? null,
        attribution: payload.route.attribution,
        sharedDemoRouting: Boolean(payload.sharedDemoRouting),
      });
    } catch {
      setRoute({
        status: "error",
        message: "Network problem while calculating the route. Check your connection and try again.",
        retryable: true,
      });
    }
  }

  function clearLocation() {
    setGeo({ status: "idle" });
    setRoute({ status: "idle" });
  }

  return (
    <div className="space-y-4">
      <VenueMap
        destination={{
          latitude: venue.latitude,
          longitude: venue.longitude,
          label: venue.name,
          approximate: venue.approximate,
        }}
        origin={origin}
        route={route.status === "ready" ? route.geometry : null}
        className="h-72 md:h-80"
      />

      {/* Location, distance and routing. */}
      <div className="rounded-2xl border border-[#E6E7EF] bg-white p-4">
        {geo.status !== "ready" ? (
          <>
            <p className="text-sm text-[#5B6178]">
              Share your location once and Krew will estimate how far the venue is and draw a route. Permission is asked
              only when you tap the button, and your position is never stored or shown to organizers.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={useMyLocation}
                disabled={geo.status === "requesting"}
                className="min-h-11"
              >
                {geo.status === "requesting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                )}
                {geo.status === "requesting" ? "Getting your location…" : "Use my current location"}
              </Button>
              {geo.status === "requesting" ? (
                <span className="self-center text-xs text-[#8A90A6]">Waiting for your device to answer…</span>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="text-sm text-[#0B1020]">
                <span className="font-semibold">
                  {straightLineMeters !== null ? formatDistance(straightLineMeters) : "—"}
                </span>{" "}
                away
              </p>
              <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={clearLocation}>
                Clear my location
              </Button>
            </div>
            <p className="text-xs text-[#8A90A6]">
              Straight-line estimate between you and the venue — it is not a travel distance.
            </p>

            {routeEnabled ? (
              <div className="space-y-2">
                {route.status === "idle" ? (
                  <Button type="button" variant="secondary" onClick={loadRoute} className="min-h-11">
                    <Route className="h-4 w-4" aria-hidden="true" />
                    Show driving route
                  </Button>
                ) : null}

                {route.status === "loading" ? (
                  <p className="flex items-center gap-2 text-sm text-[#5B6178]" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Calculating the route…
                  </p>
                ) : null}

                {route.status === "ready" ? (
                  <div className="rounded-xl border border-[#E6E7EF] bg-[#F9F9FC] p-3">
                    <p className="text-sm text-[#0B1020]">
                      About <span className="font-semibold">{formatDistance(route.distanceMeters)}</span> by road ·{" "}
                      <span className="font-semibold">{formatDuration(route.durationSeconds)}</span> in normal traffic
                    </p>
                    <p className="mt-1 text-xs text-[#8A90A6]">
                      Routing estimate, not a guarantee. {route.attribution}
                      {route.sharedDemoRouting
                        ? " Preview routes use a shared public service, so treat them as a guide rather than a production-grade estimate."
                        : ""}
                    </p>
                  </div>
                ) : null}

                {route.status === "error" ? (
                  <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="flex gap-2 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {route.message}
                    </p>
                    {route.retryable ? (
                      <Button type="button" variant="outline" size="sm" className="mt-2 min-h-9" onClick={loadRoute}>
                        Try the route again
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {geo.status === "error" ? (
          <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {geo.message}
          </p>
        ) : null}
      </div>

      {/* Directions. Always available: they need nothing from your device. */}
      <div className="rounded-2xl border border-[#E6E7EF] bg-white p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-[#0B1020]">
          <Compass className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
          Directions to {venue.name}
        </p>

        {links.length > 0 ? (
          <>
            {navigateLink ? (
              <a
                href={navigateLink.href}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B3DF5] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(91,61,245,0.28)] transition hover:bg-[#4A2FD6]"
              >
                <Navigation className="h-4 w-4 shrink-0" aria-hidden="true" />
                {navigateLink.label}
              </a>
            ) : null}

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {mapLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#E6E7EF] px-3 py-2 text-sm font-medium text-[#141B41] transition hover:border-[#5B3DF5] hover:bg-[#F2F0FF]"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#8A90A6]">
              {navigateLink?.description ?? "Directions"}. The map links open in a new tab. All of them use the venue
              coordinates saved by the organizer — none are guessed.
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#5B6178]">
            No coordinates have been confirmed for this venue, so there is nothing to navigate to yet. Use the address
            and arrival instructions above, and contact your organizer if the venue is unclear.
          </p>
        )}
      </div>

      <p className="flex gap-2 text-xs text-[#8A90A6]">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Krew does not track you in the background, does not store your live position, and never shows it to organizers.
      </p>
    </div>
  );
}
