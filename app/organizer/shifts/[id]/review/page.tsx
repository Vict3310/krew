import Link from "next/link";
import { notFound } from "next/navigation";

import ApplicantReview from "@/components/organizer/applicant-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getOrganizerShift, getShiftApplicationsForOrganizer } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { shiftStatusLabel, shiftStatusTone } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function OrganizerShiftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const { id } = await params;

  const shift = await getOrganizerShift(id, user.id);
  if (!shift) notFound();

  const applications = await getShiftApplicationsForOrganizer(id, user.id);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Applications</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">{shift.title}</h1>
          <p className="mt-2 text-sm text-[#5B6178]">
            {shift.venue}, {shift.location} · {formatDate(shift.shiftDate)} · {shift.startTime}–{shift.endTime} ·{" "}
            {formatCurrency(shift.compensation)} per person
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={shiftStatusTone(shift.status)}>{shiftStatusLabel(shift.status)}</Badge>
          <Link href="/organizer/shifts"><Button variant="secondary">Back to roster</Button></Link>
        </div>
      </div>

      <ApplicantReview
        shiftId={shift.id}
        shiftTitle={shift.title}
        requiredStaff={shift.requiredStaff}
        confirmed={shift._count.assignments}
        applications={applications.map((application) => ({
          id: application.id,
          status: application.status,
          coverNote: application.coverNote,
          createdAt: application.createdAt.toISOString(),
          userId: application.user.id,
          name: application.user.name ?? application.user.username,
          username: application.user.username,
          email: application.user.email,
          city: application.user.workerProfile?.city ?? null,
          availability: application.user.workerProfile?.availability ?? null,
          skills: application.user.workerProfile?.skills ?? [],
          bio: application.user.workerProfile?.bio ?? null,
        }))}
      />
    </main>
  );
}
