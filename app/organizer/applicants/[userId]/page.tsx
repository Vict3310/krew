import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import ApplicantReview from "@/components/organizer/applicant-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getActiveAssignmentCountsByOpening } from "@/lib/data";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ shiftId?: string }>;
}) {
  const organizer = await requireRole(["ORGANIZER", "ADMIN"]);
  const { userId } = await params;
  const { shiftId } = await searchParams;

  if (!shiftId) notFound();

  // Ownership is enforced in the query: only applications on this organizer's shift resolve.
  const application = await prisma.shiftApplication.findFirst({
    where: {
      userId,
      shiftId,
      shift: organizer.role === "ADMIN" ? {} : { organizerId: organizer.id },
    },
    include: {
      opening: true,
      shift: {
        select: {
          id: true,
          title: true,
          requiredStaff: true,
          category: true,
          openings: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, headcount: true } },
        },
      },
      user: { include: { workerProfile: true } },
    },
  });

  if (!application) notFound();

  const filledByOpening = await getActiveAssignmentCountsByOpening(application.shift.id);
  const confirmed = Object.values(filledByOpening).reduce((sum, count) => sum + count, 0);

  const openings =
    application.shift.openings.length > 0
      ? application.shift.openings.map((opening) => ({
          id: opening.id,
          role: opening.role,
          headcount: opening.headcount,
          confirmed: filledByOpening[opening.id] ?? 0,
        }))
      : [
          {
            id: "unassigned",
            role: application.shift.category,
            headcount: application.shift.requiredStaff,
            confirmed,
          },
        ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Candidate profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">
            {application.user.name ?? application.user.username}
          </h1>
          <p className="mt-1 text-sm text-[#5B6178]">
            Applying for {application.shift.title}
          </p>
        </div>
        <Link href={`/organizer/shifts/${application.shift.id}/review`}>
          <Button variant="secondary">Back to applicants</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            @{application.user.username}
            {application.user.workerProfile?.city ? <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{application.user.workerProfile.city}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#5B6178]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#F4F4F9] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Email</p>
              <p className="mt-2 font-medium text-[#0B1020]">{application.user.email}</p>
            </div>
            <div className="rounded-2xl bg-[#F4F4F9] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Availability</p>
              <p className="mt-2 font-medium text-[#0B1020]">{application.user.workerProfile?.availability ?? "Not specified"}</p>
            </div>
          </div>

          {application.user.workerProfile?.skills?.length ? (
            <div className="rounded-2xl bg-[#F4F4F9] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Experience</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {application.user.workerProfile.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-[#EDEAFF] px-2.5 py-1 text-xs text-[#3B2BA8]">{skill}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-[#F4F4F9] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">About</p>
            <p className="mt-2">{application.user.workerProfile?.bio || "This worker has not added a summary yet."}</p>
          </div>
        </CardContent>
      </Card>

      <ApplicantReview
        shiftId={application.shift.id}
        shiftTitle={application.shift.title}
        requiredStaff={application.shift.requiredStaff}
        confirmed={confirmed}
        openings={openings}
        applications={[
          {
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
          },
        ]}
      />
    </main>
  );
}
