import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { searchPlaces } from "@/lib/geo/geocoding";

/**
 * Venue search for organizers.
 *
 * Proxied through the server so the geocoding service is never called straight
 * from a browser, the identifying User-Agent and rate limit are applied in one
 * place, and results are cached. Workers have no reason to search for venues.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Only organizer accounts can search venue locations." }, { status: 403 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ error: "Type at least 3 characters to search." }, { status: 400 });
  }

  const outcome = await searchPlaces(query.slice(0, 160), {
    countryCodes: process.env.GEOCODING_COUNTRY_CODES?.trim() || "ng",
  });

  if (!outcome.ok) {
    return NextResponse.json({ ok: false, reason: outcome.reason, message: outcome.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, places: outcome.places });
}
