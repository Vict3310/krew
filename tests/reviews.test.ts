import { describe, expect, it } from "vitest";

import {
  MAX_COMMENT_LENGTH,
  canReviewAssignment,
  formatAverage,
  ratingLabel,
  summarizeRatings,
  validateReview,
} from "@/lib/reviews";

describe("review input", () => {
  it("accepts a whole rating in range", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const result = validateReview({ rating });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.rating).toBe(rating);
    }
  });

  it("accepts a numeric string, which is what a select posts", () => {
    const result = validateReview({ rating: "4", comment: "Great work" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rating).toBe(4);
      expect(result.comment).toBe("Great work");
    }
  });

  it("rejects ratings outside 1 to 5, non-integers and junk", () => {
    for (const rating of [0, 6, -1, 3.5, "abc", null, undefined, {}, NaN]) {
      expect(validateReview({ rating }).ok).toBe(false);
    }
  });

  it("treats a blank comment as no comment", () => {
    const result = validateReview({ rating: 5, comment: "   " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.comment).toBeNull();
  });

  it("rejects a comment over the length limit", () => {
    const result = validateReview({ rating: 5, comment: "x".repeat(MAX_COMMENT_LENGTH + 1) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/under/i);
  });
});

describe("review eligibility", () => {
  const past = new Date("2026-01-01T00:00:00.000Z");
  const future = new Date("2030-01-01T00:00:00.000Z");
  const now = new Date("2026-06-01T00:00:00.000Z");

  it("allows a review once the event day has passed", () => {
    expect(canReviewAssignment({ assignmentStatus: "ASSIGNED", shiftStatus: "PUBLISHED", shiftDate: past, now }).allowed).toBe(true);
  });

  it("allows a review when the shift or the assignment was completed early", () => {
    expect(canReviewAssignment({ assignmentStatus: "ASSIGNED", shiftStatus: "COMPLETED", shiftDate: future, now }).allowed).toBe(true);
    expect(canReviewAssignment({ assignmentStatus: "COMPLETED", shiftStatus: "PUBLISHED", shiftDate: future, now }).allowed).toBe(true);
  });

  it("refuses a review before the event is done", () => {
    const gate = canReviewAssignment({ assignmentStatus: "ASSIGNED", shiftStatus: "PUBLISHED", shiftDate: future, now });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/once the event is done/i);
  });

  it("refuses a review for a worker who was removed from the shift", () => {
    const gate = canReviewAssignment({ assignmentStatus: "CANCELLED", shiftStatus: "COMPLETED", shiftDate: past, now });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/removed/i);
  });
});

describe("rating summary", () => {
  it("reports nothing rather than a fake zero when there are no ratings", () => {
    const summary = summarizeRatings([]);
    expect(summary.average).toBeNull();
    expect(summary.count).toBe(0);
    expect(summary.distribution).toEqual([]);
    expect(formatAverage(summary.average)).toBe("No ratings yet");
  });

  it("averages to one decimal place", () => {
    expect(summarizeRatings([5, 4]).average).toBe(4.5);
    expect(summarizeRatings([5, 4, 4]).average).toBe(4.3);
    expect(summarizeRatings([5]).average).toBe(5);
  });

  it("counts each star value, highest first, and ignores invalid ratings", () => {
    const summary = summarizeRatings([5, 5, 3, 3, 3, 0, 9, NaN]);
    expect(summary.count).toBe(5);
    expect(summary.distribution).toEqual([
      { rating: 5, count: 2 },
      { rating: 4, count: 0 },
      { rating: 3, count: 3 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ]);
  });

  it("describes a rating in words for assistive technology", () => {
    expect(ratingLabel(4)).toBe("4 out of 5 stars");
  });
});
