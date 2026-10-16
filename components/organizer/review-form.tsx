"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";

import RatingStars from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createReview } from "@/lib/actions/reviews";
import { MAX_RATING, ratingLabel } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

export type ExistingReview = {
  rating: number;
  comment: string | null;
  createdAt: string;
};

/** Five stars, typed as buttons so the rating is reachable by keyboard. */
function StarPicker({ value, onChange, disabled }: { value: number; onChange: (next: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          aria-label={ratingLabel(star)}
          aria-pressed={star === value}
          className="rounded-md p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            className={star <= value ? "h-6 w-6 fill-[#F5A524] text-[#F5A524]" : "h-6 w-6 text-[#C9CBDA]"}
            aria-hidden="true"
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-[#5B6178]">{ratingLabel(value)}</span>
    </div>
  );
}

/**
 * Leave a review on a worker, or read back the one already left for this shift.
 *
 * Whether a review is allowed is decided on the server; this form only appears
 * when the caller has established that this organizer hired this worker and the
 * event is done.
 */
export default function ReviewForm({
  workerId,
  workerName,
  shiftId,
  shiftTitle,
  existing,
}: {
  workerId: string;
  workerName: string;
  shiftId: string;
  shiftTitle: string;
  existing: ExistingReview | null;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your review</CardTitle>
          <CardDescription>
            You rated {workerName} for {shiftTitle} on {formatDate(existing.createdAt)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <RatingStars rating={existing.rating} />
          <p className="text-sm text-[#5B6178]">{existing.comment || "No comment was added."}</p>
        </CardContent>
      </Card>
    );
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await createReview({ workerId, shiftId, rating, comment });

      if (!result.ok) {
        setError(result.error ?? "We could not save that review.");
        push({ title: "Review not saved", description: result.error, variant: "error" });
        return;
      }

      setComment("");
      push({
        title: "Review published",
        description: `${workerName}'s profile now shows your rating.`,
        variant: "success",
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate this worker</CardTitle>
        <CardDescription>
          {workerName} was on your crew for {shiftTitle}. Your rating appears on their profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <StarPicker value={rating} onChange={setRating} disabled={pending} />

        <div className="space-y-2">
          <label htmlFor="review-comment" className="text-sm font-medium text-[#0B1020]">
            Comment (optional)
          </label>
          <textarea
            id="review-comment"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Turned up on time, handled the gate queue calmly…"
            className="w-full rounded-xl border border-[#E6E7EF] bg-white px-3 py-2 text-sm text-[#0B1020] outline-none focus:border-[#4A2FD6]"
          />
        </div>

        <Button onClick={submit} disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</> : <><CheckCircle2 className="h-4 w-4" /> Publish review</>}
        </Button>
      </CardContent>
    </Card>
  );
}
