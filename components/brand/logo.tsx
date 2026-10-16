import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The Krew symbol: a "K" drawn as connected points.
 *
 * The spine and the two arms are strokes between nodes, so the mark reads as
 * people joined into a crew while still resolving as a K at 16px. It paints in
 * `currentColor`, so colour is decided by the surface it sits on.
 */
export function KrewMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Spine and the two arms of the K. */}
      <path d="M5 4v16" />
      <path d="M5 12l14-8" />
      <path d="M5 12l14 8" />
      {/* Nodes: the people the strokes connect. */}
      <circle cx="5" cy="4" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="20" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="4" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="20" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The mark on a solid brand tile. Used for the app icon and dark headers. */
export function KrewMarkTile({ className, tone = "brand" }: { className?: string; tone?: "brand" | "navy" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl text-white",
        tone === "brand" ? "bg-[var(--krew-violet)]" : "bg-[var(--krew-navy)]",
        "h-9 w-9",
        className,
      )}
    >
      <KrewMark className="h-5 w-5" />
    </span>
  );
}

export function KrewWordmark({ className, tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="text-[17px] font-semibold tracking-[-0.02em]">Krew</span>
      {tagline ? (
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] opacity-60">
          Your people. Your event. Your moment.
        </span>
      ) : null}
    </span>
  );
}

/**
 * Mark + wordmark. `variant` decides the ink so the same component works on
 * light surfaces and on midnight navy without a second implementation.
 */
export function KrewLogo({
  href = "/",
  variant = "light",
  compact = false,
  tagline = false,
  className,
}: {
  href?: string;
  variant?: "light" | "inverse";
  compact?: boolean;
  tagline?: boolean;
  className?: string;
}) {
  const content = (
    <span className={cn("flex items-center gap-2.5 overflow-hidden", className)}>
      <KrewMark
        className={cn("h-6 w-6 shrink-0", variant === "inverse" ? "text-[var(--krew-violet-bright)]" : "text-[var(--krew-violet)]")}
      />
      {!compact ? <KrewWordmark tagline={tagline} /> : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={`${BRAND.name} home`} className="flex items-center">
      {content}
    </Link>
  );
}
