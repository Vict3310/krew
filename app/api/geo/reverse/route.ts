import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { toCoordinates } from "@/lib/geo/coordinates";
import { reverseGeocode } from "@/lib/geo/geocoding";

/**
 * Turns a manually placed pin into a readable address.
 *
 * Coordinates are validated before they reach the geocoder, and a failed lookup
 * returns no address rather than a guessed one — the organizer keeps whatever
 * they typed.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Only organizer accounts can look up venue addresses." }, { status: 403 });
  }

  const latitude = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(request.nextUrl.searchParams.get("lon") ?? "");
  const coordinates = toCoordinates(latitude, longitude);

  if (!coordinates) {
    return NextResponse.json({ error: "Provide a valid latitude and longitude." }, { status: 400 });
  }

  const outcome = await reverseGeocode(coordinates);

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, reason: outcome.reason, message: outcome.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, places: outcome.places });
}
