import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import Avatar from "@/components/avatar";
import ApplicantReview from "@/components/organizer/applicant-review";
import ReviewForm from "@/components/organizer/review-form";
import RatingStars from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getActiveAssignmentCountsByOpening, getReviewContext, getWorkerReviews } from "@/lib/data";
import { prisma } from "@/lib/db";
import { canReviewAssignment, formatAverage, summarizeRatings } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

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
      // Only the avatar's metadata: the bytes come from /api/avatars.
      user: { include: { workerProfile: true, avatar: { select: { updatedAt: true } } } },
    },
  });

  if (!application) notFound();

  const [filledByOpening, reviews, reviewContext] = await Promise.all([
    getActiveAssignmentCountsByOpening(application.shift.id),
    getWorkerReviews(userId),
    getReviewContext({
      organizerId: organizer.id,
      workerId: userId,
      shiftId,
      isAdmin: organizer.role === "ADMIN",
    }),
  ]);

  const confirmed = Object.values(filledByOpening).reduce((sum, count) => sum + count, 0);
  const ratingSummary = summarizeRatings(reviews.map((review) => review.rating));

  // Reviewing is unlocked by the same rule the server enforces, so the form is
  // only offered when submitting it would actually succeed.
  const reviewGate = reviewContext
    ? canReviewAssignment({
        assignmentStatus: reviewContext.status,
        shiftStatus: reviewContext.shift.status,
        shiftDate: reviewContext.shift.shiftDate,
      })
    : null;

  const workerName = application.user.name ?? application.user.username;

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
        <div className="flex items-center gap-4">
          <Avatar
            userId={application.user.id}
            name={workerName}
            version={application.user.avatar?.updatedAt}
            size={64}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Candidate profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">{workerName}</h1>
            <p className="mt-1 text-sm text-[#5B6178]">Applying for {application.shift.title}</p>
          </div>
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Reviews from organizers</CardTitle>
              <CardDescription>
                {ratingSummary.count === 0
                  ? "No organizer has reviewed this worker yet."
                  : `${ratingSummary.count} ${ratingSummary.count === 1 ? "review" : "reviews"} from organizers.`}
              </CardDescription>
            </div>
            <span className="text-lg font-semibold text-[#0B1020]">{formatAverage(ratingSummary.average)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-[#5B6178]">
              Reviews appear here once an organizer has worked with this person and rated them.
            </p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FBFBFE] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#0B1020]">
                    {review.author.name ?? review.author.username}
                    <span className="ml-2 text-xs font-normal text-[#8A90A6]">
                      {review.author.role === "ADMIN" ? "Administrator" : "Organizer"}
                    </span>
                  </p>
                  <RatingStars rating={review.rating} />
                </div>
                {review.comment ? <p className="mt-2 text-sm text-[#5B6178]">{review.comment}</p> : null}
                <p className="mt-2 text-xs text-[#8A90A6]">
                  {review.assignment?.shift?.title ? `${review.assignment.shift.title} · ` : ""}
                  {formatDate(review.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {reviewContext ? (
        reviewContext.review ? (
          <ReviewForm
            workerId={application.user.id}
            workerName={workerName}
            shiftId={application.shift.id}
            shiftTitle={application.shift.title}
            existing={{
              rating: reviewContext.review.rating,
              comment: reviewContext.review.comment,
              createdAt: reviewContext.review.createdAt.toISOString(),
            }}
          />
        ) : reviewGate?.allowed ? (
          <ReviewForm
            workerId={application.user.id}
            workerName={workerName}
            shiftId={application.shift.id}
            shiftTitle={application.shift.title}
            existing={null}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Rate this worker</CardTitle>
              <CardDescription>{reviewGate?.reason ?? "You cannot review this shift yet."}</CardDescription>
            </CardHeader>
          </Card>
        )
      ) : null}

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
            name: workerName,
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
