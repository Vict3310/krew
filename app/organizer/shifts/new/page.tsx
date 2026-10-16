import { notFound } from "next/navigation";

import ShiftForm from "@/components/organizer/shift-form";
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

  let initial = {
    title: "",
    category: "",
    location: "",
    venue: "",
    date: isoDate(14),
    startTime: "09:00",
    endTime: "17:00",
    requiredStaff: 8,
    compensation: 40000,
    deadline: isoDate(10),
    description: "",
  };

  let venueLocation: VenueLocationValue | undefined;

  if (edit) {
    const shift = await getOrganizerShift(edit, user.id);
    if (!shift) notFound();

    initial = {
      title: shift.title,
      category: shift.category,
      location: shift.location,
      venue: shift.venue,
      date: shift.shiftDate.toISOString().slice(0, 10),
      startTime: shift.startTime,
      endTime: shift.endTime,
      requiredStaff: shift.requiredStaff,
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
