import Link from "next/link";

import ShiftList from "@/components/organizer/shift-list";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getOrganizerShifts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrganizerShiftsPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const shifts = await getOrganizerShifts(user.id);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Organizer</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Shift roster</h1>
          <p className="mt-2 text-sm text-[#5B6178]">
            {shifts.length} {shifts.length === 1 ? "shift" : "shifts"} on your account.
          </p>
        </div>
        <Link href="/organizer/shifts/new"><Button>New shift</Button></Link>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6E7EF] bg-[#FAFAFD] p-10 text-center">
          <p className="text-lg font-semibold text-[#0B1020]">You have not published a shift yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5B6178]">
            Publish a staffing request with the role, venue, date, pay and headcount to start receiving applications.
          </p>
          <Link href="/organizer/shifts/new" className="mt-6 inline-block"><Button>Post your first shift</Button></Link>
        </div>
      ) : (
        <ShiftList
          shifts={shifts.map((shift) => ({
            id: shift.id,
            title: shift.title,
            status: shift.status,
            location: shift.location,
            venue: shift.venue,
            shiftDate: shift.shiftDate.toISOString(),
            compensation: shift.compensation,
            requiredStaff: shift.requiredStaff,
            applicationsCount: shift._count.applications,
            assignmentsCount: shift._count.assignments,
          }))}
        />
      )}
    </main>
  );
}
