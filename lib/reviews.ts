/**
 * Reviews.
 *
 * An organizer rates a worker they actually hired. The rules that decide
 * whether a review is allowed, and how a set of ratings is summarised, live here
 * as pure functions so they can be tested without a database — the same rules
 * are then enforced again on the server, which remains the authority.
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_COMMENT_LENGTH = 600;

export type ReviewValidation =
  | { ok: true; rating: number; comment: string | null }
  | { ok: false; error: string };

/**
 * Validate a submitted rating and comment.
 *
 * Rating may arrive as a number or a numeric string (a select posts a string),
 * so it is normalised here rather than trusted.
 */
export function validateReview(input: { rating: unknown; comment?: unknown }): ReviewValidation {
  const rating = typeof input.rating === "string" ? Number(input.rating) : input.rating;

  if (typeof rating !== "number" || !Number.isInteger(rating)) {
    return { ok: false, error: "Choose a rating from 1 to 5 stars." };
  }

  if (rating < MIN_RATING || rating > MAX_RATING) {
    return { ok: false, error: "Choose a rating from 1 to 5 stars." };
  }

  const rawComment = typeof input.comment === "string" ? input.comment.trim() : "";
  if (rawComment.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Keep your comment under ${MAX_COMMENT_LENGTH} characters.` };
  }

  return { ok: true, rating, comment: rawComment || null };
}

export type ReviewEligibility = { allowed: boolean; reason?: string };

/**
 * A review is earned by working together.
 *
 * The organizer can only review a worker after the shift is over: either the
 * assignment was closed out (which releasing escrow does), the shift was marked
 * complete, or the event date has simply passed.
 */
export function canReviewAssignment(input: {
  assignmentStatus: string;
  shiftStatus: string;
  shiftDate: Date;
  now?: Date;
}): ReviewEligibility {
  if (input.assignmentStatus === "CANCELLED") {
    return { allowed: false, reason: "This worker was removed from the shift, so there is nothing to review." };
  }

  const now = input.now ?? new Date();
  const eventDayReached = input.shiftDate.getTime() <= now.getTime();

  if (!eventDayReached && input.shiftStatus !== "COMPLETED" && input.assignmentStatus !== "COMPLETED") {
    return { allowed: false, reason: "You can leave a review once the event is done." };
  }

  return { allowed: true };
}

export type RatingSummary = {
  /** Null when there are no ratings yet — never a fake zero. */
  average: number | null;
  count: number;
  /** How many reviews gave each star value, lowest first. */
  distribution: { rating: number; count: number }[];
};

export function summarizeRatings(ratings: number[]): RatingSummary {
  const valid = ratings.filter((rating) => Number.isFinite(rating) && rating >= MIN_RATING && rating <= MAX_RATING);

  if (valid.length === 0) {
    return { average: null, count: 0, distribution: [] };
  }

  const total = valid.reduce((sum, rating) => sum + rating, 0);

  return {
    // One decimal place is enough to be meaningful without implying precision.
    average: Math.round((total / valid.length) * 10) / 10,
    count: valid.length,
    distribution: Array.from({ length: MAX_RATING }, (_, index) => {
      const rating = index + 1;
      return { rating, count: valid.filter((value) => value === rating).length };
    }).reverse(),
  };
}

/** Accessible label for a rating, e.g. "4 out of 5 stars". */
export function ratingLabel(rating: number): string {
  return `${rating} out of ${MAX_RATING} stars`;
}

export function formatAverage(average: number | null): string {
  return average === null ? "No ratings yet" : `${average.toFixed(1)} / ${MAX_RATING}`;
}
