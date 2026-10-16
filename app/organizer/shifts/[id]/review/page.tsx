import Link from "next/link";
import { notFound } from "next/navigation";

import ApplicantReview from "@/components/organizer/applicant-review";
import EscrowPanel from "@/components/organizer/escrow-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getActiveAssignmentCountsByOpening, getOrganizerShift, getShiftApplicationsForOrganizer } from "@/lib/data";
import { canReleaseEscrow, escrowRequiredAmount } from "@/lib/escrow";
import { formatCurrency, formatDate } from "@/lib/utils";
import { shiftStatusLabel, shiftStatusTone } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function OrganizerShiftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const { id } = await params;

  const shift = await getOrganizerShift(id, user.id);
  if (!shift) notFound();

  const [applications, filledByOpening] = await Promise.all([
    getShiftApplicationsForOrganizer(id, user.id),
    getActiveAssignmentCountsByOpening(id),
  ]);

  const crewCount = Object.values(filledByOpening).reduce((sum, count) => sum + count, 0);
  const requiredAmount = escrowRequiredAmount(shift.compensation, shift.requiredStaff);
  const releaseGate = canReleaseEscrow({
    fundingStatus: shift.fundingStatus,
    shiftStatus: shift.status,
    shiftDate: shift.shiftDate,
  });

  // Legacy shifts (created before worker types) have no openings and fall back to
  // one line built from the shift's own category and headcount.
  const openings =
    shift.openings.length > 0
      ? shift.openings.map((opening) => ({
          id: opening.id,
          role: opening.role,
          headcount: opening.headcount,
          confirmed: filledByOpening[opening.id] ?? 0,
        }))
      : [
          {
            id: "unassigned",
            role: shift.category,
            headcount: shift.requiredStaff,
            confirmed: crewCount,
          },
        ];

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

      <Card>
        <CardHeader>
          <CardTitle>Crew roles</CardTitle>
          <CardDescription>
            {crewCount}/{shift.requiredStaff} confirmed across {openings.length} {openings.length === 1 ? "role" : "roles"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {openings.map((opening) => {
            const full = opening.confirmed >= opening.headcount;
            return (
              <div key={opening.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#0B1020]">{opening.role}</p>
                  <Badge variant={full ? "secondary" : "default"}>{full ? "Filled" : "Open"}</Badge>
                </div>
                <p className="mt-2 text-sm text-[#5B6178]">
                  {opening.confirmed}/{opening.headcount} confirmed · {Math.max(0, opening.headcount - opening.confirmed)} needed
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <EscrowPanel
        shiftId={shift.id}
        shiftTitle={shift.title}
        fundingStatus={shift.fundingStatus}
        escrowAmount={shift.escrowAmount}
        requiredAmount={requiredAmount}
        compensation={shift.compensation}
        crewCount={crewCount}
        shiftDate={shift.shiftDate.toISOString()}
        canRelease={releaseGate.allowed}
        releaseHint={releaseGate.reason}
      />

      <ApplicantReview
        shiftId={shift.id}
        shiftTitle={shift.title}
        requiredStaff={shift.requiredStaff}
        confirmed={crewCount}
        openings={openings}
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
          requestedRole: application.opening?.role ?? null,
          openingId: application.openingId,
        }))}
      />
    </main>
  );
}
