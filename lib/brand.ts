/**
 * The single source of truth for Krew's public brand.
 *
 * Anything that spells the product name, tagline or default metadata reads from
 * here so the brand can never drift between screens.
 */

export const BRAND = {
  name: "Krew",
  /** Longer descriptor used where a one-word name needs context. */
  fullName: "Krew — event staffing marketplace",
  tagline: "Your people. Your event. Your moment.",
  promise:
    "Krew brings event organizers and reliable event workers together so great events happen with the right people in the right place at the right time.",
  /** Short line used under the wordmark and in metadata. */
  description:
    "Krew connects event organizers with reliable event workers. Publish staffing requests, apply for shifts, and manage every confirmation in one place.",
  domain: "krew.ng",
  year: 2026,
} as const;

export const NAV_LABELS = {
  worker: "Find event work",
  organizer: "Hire event staff",
} as const;

/** Routes that carry brand-intent, shared by landing, auth and navigation. */
export const SIGNUP_ROUTES = {
  worker: "/auth/register?role=worker&next=/onboarding",
  organizer: "/auth/register?role=organizer&next=/onboarding",
} as const;
