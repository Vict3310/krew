import Link from "next/link";

import ShiftBrowser, { type ShiftListItem } from "@/components/shift-browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMarketplaceFacets, getPublicShifts } from "@/lib/data";
import { isDatabaseUnavailableError } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Open event shifts | Krew",
};

export default async function ShiftsPage() {
  let shifts: ShiftListItem[] = [];
  let facets: { locations: string[]; categories: string[] } = { locations: [], categories: [] };
  let unavailable = false;

  try {
    const [rows, facetOptions] = await Promise.all([getPublicShifts(), getMarketplaceFacets()]);
    facets = facetOptions;
    shifts = rows.map((shift) => ({
      id: shift.id,
      title: shift.title,
      category: shift.category,
      location: shift.location,
      venue: shift.venue,
      shiftDate: shift.shiftDate.toISOString(),
      startTime: shift.startTime,
      endTime: shift.endTime,
      compensation: shift.compensation,
      requiredStaff: shift.requiredStaff,
      applicationDeadline: shift.applicationDeadline.toISOString(),
      applicationsCount: shift._count.applications,
      organizerName: shift.organizer?.name ?? shift.organizer?.username ?? "Event organizer",
      openings: shift.openings.map((opening) => ({ role: opening.role, headcount: opening.headcount })),
    }));
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;
    unavailable = true;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Marketplace</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Open event shifts</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B6178]">
            Every request below is an open staffing call from a real organizer, with pay and requirements shown up front.
          </p>
        </div>
        <Link href="/organizer/shifts/new">
          <Button variant="outline">Post a shift</Button>
        </Link>
      </div>

      {unavailable ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center">
            <p className="text-lg font-semibold text-amber-900">The marketplace is temporarily unavailable</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-amber-800">
              We could not reach the database, so we are not showing any shifts. Please try again shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ShiftBrowser shifts={shifts} facets={facets} />
      )}
    </main>
  );
}
