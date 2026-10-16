import { notFound } from "next/navigation";

import ShiftForm, { type ShiftFormValues } from "@/components/organizer/shift-form";
import type { VenueLocationValue } from "@/components/venue/venue-picker";
import { requireRole } from "@/lib/auth";
import { getOrganizerShift } from "@/lib/data";

export const dynamic = "force-dynamic";

function isoDate(offsetDays: number) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const { edit } = await searchParams;

  let initial: ShiftFormValues = {
    title: "",
    openings: [{ role: "", headcount: 1 }],
    location: "",
    venue: "",
    date: isoDate(14),
    startTime: "09:00",
    endTime: "17:00",
    compensation: 40000,
    deadline: isoDate(10),
    description: "",
  };

  let venueLocation: VenueLocationValue | undefined;

  if (edit) {
    const shift = await getOrganizerShift(edit, user.id);
    if (!shift) notFound();

    /*
     * Shifts created before worker types existed have no openings. They are shown
     * as a single role built from the shift's own category and headcount, so the
     * organizer edits them in the same interface and saves them as real roles.
     */
    const openings =
      shift.openings.length > 0
        ? shift.openings.map((opening) => ({ role: opening.role, headcount: opening.headcount }))
        : [{ role: shift.category, headcount: shift.requiredStaff }];

    initial = {
      title: shift.title,
      openings,
      location: shift.location,
      venue: shift.venue,
      date: shift.shiftDate.toISOString().slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
      compensation: shift.compensation,
      deadline: shift.applicationDeadline.toISOString().slice(0, 10),
      description: shift.description,
    };

    venueLocation = {
      venueAddress: shift.venueAddress ?? "",
      latitude: shift.latitude,
      longitude: shift.longitude,
      locationPrecision:
        shift.locationPrecision === "EXACT" || shift.locationPrecision === "APPROXIMATE"
          ? shift.locationPrecision
          : "",
      arrivalInstructions: shift.arrivalInstructions ?? "",
      arrivalContact: shift.arrivalContact ?? "",
      arrivalTime: shift.arrivalTime ?? "",
    };
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <ShiftForm shiftId={edit} initial={initial} initialVenueLocation={venueLocation} />
    </main>
  );
}
