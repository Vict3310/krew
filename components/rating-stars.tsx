import { Star } from "lucide-react";

import { MAX_RATING, ratingLabel } from "@/lib/reviews";

/**
 * Read-only stars for a stored rating. Shared so a rating looks the same
 * wherever it is shown — the organizer's review form and the worker's profile.
 */
export default function RatingStars({
  rating,
  size = 16,
  className = "",
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={["inline-flex items-center gap-0.5", className].join(" ")} role="img" aria-label={ratingLabel(rating)}>
      {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((star) => (
        <Star
          key={star}
          style={{ width: size, height: size }}
          className={star <= rating ? "fill-[#F5A524] text-[#F5A524]" : "text-[#D7D9E4]"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
