import { NextResponse, type NextRequest } from "next/server";
import { AssignmentStatus } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { toCoordinates, venueCoordinates } from "@/lib/geo/coordinates";
import { getRoutingProvider, usesSharedDemoRouting } from "@/lib/geo/routing";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  from: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

const ACTIVE_ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.ASSIGNED,
  AssignmentStatus.CONFIRMED,
  AssignmentStatus.COMPLETED,
];

/**
 * Route preview for one of the signed-in worker's own assignments.
 *
 * Two deliberate design choices:
 *
 * 1. The destination is read from the assignment's shift on the server, never
 *    from the request. A worker cannot use this endpoint to route to an
 *    arbitrary place, and an assignment they do not own never resolves.
 * 2. The starting position is used only to answer this one request. It is not
 *    written to the database and is not visible to organizers anywhere.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  const assignment = await prisma.shiftAssignment.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
      shift: {
        select: {
          title: true,
          venue: true,
          location: true,
          venueAddress: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  // A missing assignment and someone else's assignment look identical here on
  // purpose: neither existence nor ownership is leaked to the caller.
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  if (!ACTIVE_ASSIGNMENT_STATUSES.includes(assignment.status)) {
    return NextResponse.json(
      { ok: false, reason: "inactive", message: "This assignment is no longer active, so routing is unavailable." },
      { status: 200 },
    );
  }

  const destination = venueCoordinates(assignment.shift);
  if (!destination) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no_venue_coordinates",
        message: "This venue has no confirmed coordinates yet, so we cannot draw a route.",
      },
      { status: 200 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  const origin = parsed.success
    ? toCoordinates(parsed.data.from.latitude, parsed.data.from.longitude)
    : null;

  if (!origin) {
    return NextResponse.json({ error: "A valid starting position is required." }, { status: 400 });
  }

  const provider = getRoutingProvider();
  const outcome = await provider.route(origin, destination);

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: outcome.reason,
        message: outcome.message,
        // The destination itself is never withheld: the map and the external
        // directions links keep working when routing does not.
        destination,
        sharedDemoRouting: usesSharedDemoRouting(),
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    destination,
    route: outcome.route,
    sharedDemoRouting: usesSharedDemoRouting(),
  });
}
