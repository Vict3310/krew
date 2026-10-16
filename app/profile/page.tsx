import ProfileForm from "@/components/profile-form";
import RatingStars from "@/components/rating-stars";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getUserProfile, getWorkerReviews } from "@/lib/data";
import { formatAverage, summarizeRatings } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const [profile, reviews] = await Promise.all([getUserProfile(user.id), getWorkerReviews(user.id)]);

  // Only workers are reviewed by organizers, so the section is reserved for them.
  const showReviews = user.role === "WORKER";
  const summary = summarizeRatings(reviews.map((review) => review.rating));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Account</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Your profile</h1>
        </div>
        {showReviews ? (
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Organizer rating</p>
            <p className="text-lg font-semibold text-[#0B1020]">{formatAverage(summary.average)}</p>
            {summary.count > 0 ? <RatingStars rating={Math.round(summary.average ?? 0)} size={14} className="mt-1 justify-end" /> : null}
          </div>
        ) : null}
      </div>

      <ProfileForm
        role={user.role}
        userId={user.id}
        hasPicture={Boolean(profile?.avatar)}
        initial={{
          name: profile?.name ?? user.name ?? "",
          username: profile?.username ?? user.username,
          email: profile?.email ?? user.email,
          city: profile?.workerProfile?.city ?? "",
          availability: profile?.workerProfile?.availability ?? "",
          skills: profile?.workerProfile?.skills ?? [],
          bio: profile?.workerProfile?.bio ?? "",
          companyName: profile?.organizerProfile?.companyName ?? "",
          location: profile?.organizerProfile?.location ?? "",
          phone: profile?.organizerProfile?.phone ?? "",
          description: profile?.organizerProfile?.description ?? "",
        }}
      />

      {showReviews ? (
        <Card>
          <CardHeader>
            <CardTitle>Reviews from organizers</CardTitle>
            <CardDescription>
              {summary.count === 0
                ? "Nothing here yet. Reviews appear after an organizer you worked with rates you."
                : `${summary.count} ${summary.count === 1 ? "organizer has" : "organizers have"} rated you.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.count === 0 ? (
              <p className="text-sm text-[#5B6178]">
                Finish a shift you were confirmed for and the organizer can leave a review.
              </p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FBFBFE] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#0B1020]">{review.author.name ?? review.author.username}</p>
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
      ) : null}
    </main>
  );
}
