"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, MapPin, Search, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VenueMap from "@/components/venue/venue-map";
import { hasConfirmedVenueCoordinates, isWithinNigeria, type Coordinates } from "@/lib/geo/coordinates";
import { buildSearchLink } from "@/lib/geo/navigation";

export type VenueLocationValue = {
  venueAddress: string;
  latitude: number | null;
  longitude: number | null;
  locationPrecision: "EXACT" | "APPROXIMATE" | "";
  arrivalInstructions: string;
  arrivalContact: string;
  arrivalTime: string;
};

export const emptyVenueLocation: VenueLocationValue = {
  venueAddress: "",
  latitude: null,
  longitude: null,
  locationPrecision: "",
  arrivalInstructions: "",
  arrivalContact: "",
  arrivalTime: "",
};

type Place = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  withinNigeria: boolean;
};

type SearchState =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "results"; places: Place[] }
  | { status: "empty" }
  | { status: "error"; message: string };

/**
 * Venue location for organizers.
 *
 * The rule this component enforces: a position is only saved once the organizer
 * has seen it and said so. Search results arrive as *candidates* the organizer
 * must confirm or drag, manual placement is labelled approximate until they say
 * otherwise, and a failed lookup fills nothing in rather than guessing.
 */
export default function VenuePicker({
  value,
  onChange,
  venueName,
  pinConfirmed,
  onPinConfirmedChange,
}: {
  value: VenueLocationValue;
  onChange: (next: VenueLocationValue) => void;
  venueName: string;
  pinConfirmed: boolean;
  onPinConfirmedChange: (next: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [addressLookup, setAddressLookup] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  const hasPin = typeof value.latitude === "number" && typeof value.longitude === "number";
  const pinOutsideNigeria = hasPin && !isWithinNigeria({ latitude: value.latitude!, longitude: value.longitude! });
  const isConfirmed = pinConfirmed && hasConfirmedVenueCoordinates(value);

  function patch(next: Partial<VenueLocationValue>) {
    onChange({ ...value, ...next });
  }

  async function runSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSearch({ status: "error", message: "Type at least 3 characters so we can find the venue." });
      return;
    }

    setSearch({ status: "searching" });

    try {
      const response = await fetch(`/api/geo/search?q=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; places?: Place[]; message?: string; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        setSearch({
          status: "error",
          message:
            payload?.message ??
            payload?.error ??
            "Venue search is unavailable right now. Place the pin manually on the map instead.",
        });
        return;
      }

      setSearch(payload.places && payload.places.length > 0 ? { status: "results", places: payload.places } : { status: "empty" });
    } catch {
      setSearch({ status: "error", message: "Network problem while searching. Place the pin manually on the map instead." });
    }
  }

  /** A chosen search result is a suggestion until the organizer confirms it. */
  function chooseCandidate(place: Place) {
    patch({
      latitude: place.latitude,
      longitude: place.longitude,
      venueAddress: value.venueAddress.trim() ? value.venueAddress : place.address,
      locationPrecision: "",
    });
    onPinConfirmedChange(false);
    setAddressLookup(null);
    setSearch({ status: "idle" });
  }

  /**
   * Manual placement. Precision becomes APPROXIMATE because a hand-placed pin is
   * exactly that until the organizer tells us otherwise.
   */
  function placePin(point: Coordinates) {
    patch({
      latitude: point.latitude,
      longitude: point.longitude,
      locationPrecision: "",
    });
    onPinConfirmedChange(false);
    setAddressLookup(null);
  }

  async function lookUpAddress() {
    if (!hasPin) return;
    setLookupBusy(true);
    setAddressLookup(null);

    try {
      const response = await fetch(`/api/geo/reverse?lat=${value.latitude}&lon=${value.longitude}`);
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; places?: Place[]; message?: string }
        | null;

      const place = payload?.places?.[0];
      if (!response.ok || !payload?.ok || !place) {
        setAddressLookup(payload?.message ?? "We could not find an address for that spot. Type the address yourself.");
        return;
      }

      setAddressLookup(`Address found: ${place.address}`);
      if (!value.venueAddress.trim()) {
        patch({ venueAddress: place.address });
      }
    } catch {
      setAddressLookup("Network problem while looking up the address. Type it yourself instead.");
    } finally {
      setLookupBusy(false);
    }
  }

  function clearPin() {
    patch({ latitude: null, longitude: null, locationPrecision: "" });
    onPinConfirmedChange(false);
    setAddressLookup(null);
  }

  const searchLink = buildSearchLink(`${venueName} ${value.venueAddress}`);

  return (
    <div className="space-y-5">
      {/* 1. Search */}
      <div>
        <Label htmlFor="venue-search">Find the venue</Label>
        <p className="mt-1 text-xs text-[#5B6178]">
          Search with the venue name, landmark or street. Nothing is saved until you confirm the pin.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="venue-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={venueName ? `e.g. ${venueName}, Lekki, Lagos` : "e.g. Eko Hotel, Victoria Island"}
            className="min-h-11"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
              }
            }}
          />
          <Button type="button" variant="secondary" className="min-h-11 sm:w-40" disabled={search.status === "searching"} onClick={runSearch}>
            {search.status === "searching" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Search
          </Button>
        </div>

        {search.status === "results" ? (
          <ul className="mt-3 space-y-2">
            {search.places.map((place) => (
              <li key={place.id} className="rounded-2xl border border-[#E6E7EF] bg-[#F9F9FC] p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#0B1020]">{place.name}</p>
                    <p className="mt-0.5 text-xs text-[#5B6178]">{place.address}</p>
                    <p className="mt-0.5 text-xs text-[#8A90A6]">
                      {place.category || "location"}
                      {place.withinNigeria ? "" : " · outside Nigeria — double-check this is the right place"}
                    </p>
                  </div>
                  <Button type="button" size="sm" className="min-h-9 shrink-0" onClick={() => chooseCandidate(place)}>
                    Use this pin
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {search.status === "empty" ? (
          <p className="mt-3 text-sm text-[#5B6178]">
            Nothing matched that search. Try a landmark or the street name, or place the pin manually on the map below.
            {searchLink ? (
              <>
                {" "}
                <a href={searchLink} target="_blank" rel="noreferrer" className="font-medium text-[#5B3DF5] underline">
                  Search OpenStreetMap instead
                </a>
                .
              </>
            ) : null}
          </p>
        ) : null}

        {search.status === "error" ? (
          <p role="alert" className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {search.message}
          </p>
        ) : null}
      </div>

      {/* 2. Confirm on the map */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Confirm on the map</Label>
          {hasPin ? (
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={lookUpAddress} disabled={lookupBusy}>
                {lookupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />}
                Look up address
              </Button>
              <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={clearPin}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove pin
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-2">
          <VenueMap
            destination={
              hasPin
                ? {
                    latitude: value.latitude,
                    longitude: value.longitude,
                    label: venueName || "Venue",
                    approximate: value.locationPrecision === "APPROXIMATE" || !isConfirmed,
                  }
                : { latitude: null, longitude: null, label: venueName || "Venue" }
            }
            onDestinationChange={placePin}
            className="h-72 md:h-80"
            emptyMessage="Search above, or tap the map to place the venue pin."
          />
        </div>

        <p className="mt-2 text-xs text-[#5B6178]">
          Tap the map or drag the pin to move it. Organizers placing pins by hand is normal — many Nigerian venues have
          no street number.
        </p>

        {addressLookup ? (
          <p className="mt-2 rounded-xl border border-[#E6E7EF] bg-[#F9F9FC] px-3 py-2 text-xs text-[#5B6178]">
            {addressLookup}
          </p>
        ) : null}
      </div>

      {/* 3. Save or confirm */}
      {hasPin ? (
        <div className="space-y-3 rounded-2xl border border-[#E6E7EF] bg-[#F9F9FC] p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-mono text-xs text-[#5B6178]">
              {value.latitude!.toFixed(5)}, {value.longitude!.toFixed(5)}
            </p>
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFAF1] px-2.5 py-1 text-xs font-medium text-[#141B41]">
                <Check className="h-3 w-3" aria-hidden="true" />
                Pin confirmed by you
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-medium text-amber-900">
                Not confirmed yet
              </span>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-[#0B1020]">How precise is this pin?</legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {(
                [
                  { id: "EXACT", label: "Exact spot", hint: "I know the entrance or building" },
                  { id: "APPROXIMATE", label: "Approximate", hint: "Nearby area, workers should confirm locally" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={value.locationPrecision === option.id}
                  onClick={() => {
                    patch({ locationPrecision: option.id });
                    onPinConfirmedChange(false);
                  }}
                  className={`min-h-11 flex-1 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    value.locationPrecision === option.id
                      ? "border-[#5B3DF5] bg-[#F2F0FF] text-[#0B1020]"
                      : "border-[#E6E7EF] bg-white text-[#5B6178] hover:border-[#A9A3E8]"
                  }`}
                >
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-[#8A90A6]">{option.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {!isConfirmed && value.locationPrecision ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9"
              onClick={() => onPinConfirmedChange(true)}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              This pin is correct
            </Button>
          ) : null}

          {pinOutsideNigeria ? (
            <p className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This pin is outside Nigeria. That is allowed, but please double-check the coordinates.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#E2E3EC] bg-[#F4F5F8] px-3 py-2 text-xs text-[#5B6178]">
          No pin saved. Workers will see the address and your arrival instructions, and Krew will tell them the
          coordinates are unconfirmed — it never guesses a location.
        </p>
      )}

      {/* 4. Address + arrival instructions */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="venue-address">Full venue address</Label>
          <p className="mt-1 text-xs text-[#5B6178]">
            Add the neighbourhood and city, and any landmark that helps. A street number is not required.
          </p>
          <textarea
            id="venue-address"
            value={value.venueAddress}
            onChange={(event) => patch({ venueAddress: event.target.value })}
            rows={2}
            maxLength={300}
            placeholder="e.g. Off Admiralty Way, Lekki Phase 1, Lagos — white gate beside the Zenith bank"
            className="mt-2 w-full rounded-xl border border-[#dfe8dd] bg-white px-3 py-2 text-sm text-[#102a1d] outline-none transition-colors placeholder:text-[#7a8f82] focus:border-[#2a6647]"
          />
        </div>

        <div>
          <Label htmlFor="arrival-time">Expected arrival time</Label>
          <Input
            id="arrival-time"
            value={value.arrivalTime}
            onChange={(event) => patch({ arrivalTime: event.target.value })}
            placeholder="e.g. 08:30, 30 minutes before doors"
            maxLength={80}
            className="mt-2 min-h-11"
          />
        </div>

        <div>
          <Label htmlFor="arrival-instructions">Arrival instructions for confirmed crew</Label>
          <p className="mt-1 text-xs text-[#5B6178]">
            Entrance name, gate, reporting point, who to ask for. Shown only to workers you have confirmed.
          </p>
          <textarea
            id="arrival-instructions"
            value={value.arrivalInstructions}
            onChange={(event) => patch({ arrivalInstructions: event.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Use the staff gate on the left of the main entrance. Ask for the crew lead at the security post. Do not use the guests' queue."
            className="mt-2 w-full rounded-xl border border-[#dfe8dd] bg-white px-3 py-2 text-sm text-[#102a1d] outline-none transition-colors placeholder:text-[#7a8f82] focus:border-[#2a6647]"
          />
        </div>

        <div>
          <Label htmlFor="arrival-contact">Who to contact on arrival</Label>
          <Input
            id="arrival-contact"
            value={value.arrivalContact}
            onChange={(event) => patch({ arrivalContact: event.target.value })}
            placeholder="e.g. Bola (crew lead) — 0801 222 8901"
            maxLength={160}
            className="mt-2 min-h-11"
          />
        </div>
      </div>

      <p className="flex gap-2 text-xs text-[#8A90A6]">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        The address, pin and instructions are stored with this staffing request. Workers you confirm see them on their
        assignment page.
      </p>
    </div>
  );
}
