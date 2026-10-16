import Link from "next/link";

import { KrewLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SIGNUP_ROUTES } from "@/lib/brand";

/**
 * The public header.
 *
 * Every screen that sits outside the signed-in shell (authentication, password
 * reset, the marketplace, settings fallbacks) renders this, so the brand is
 * presented the same way everywhere and there is only one place to maintain it.
 */
export default function SiteHeader({
  sectionLinks = true,
  signedIn = false,
}: {
  sectionLinks?: boolean;
  signedIn?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 md:px-8">
        <KrewLogo />

        <div className="hidden items-center gap-7 text-sm text-[var(--muted)] md:flex">
          {sectionLinks ? (
            <>
              <Link href="/#how-it-works" className="transition hover:text-[var(--foreground)]">How Krew works</Link>
              <Link href="/#workers" className="transition hover:text-[var(--foreground)]">For workers</Link>
              <Link href="/#organizers" className="transition hover:text-[var(--foreground)]">For organizers</Link>
            </>
          ) : null}
          <Link href="/shifts" className="transition hover:text-[var(--foreground)]">Browse shifts</Link>
        </div>

        {/* Small screens keep the marketplace reachable without a menu. */}
        <Link
          href="/shifts"
          className="mr-auto text-sm text-[var(--muted)] transition hover:text-[var(--foreground)] md:hidden"
        >
          Browse shifts
        </Link>

        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard">
              <Button size="sm" className="rounded-full">
                Go to dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="rounded-full text-[var(--foreground)]">
                  Sign in
                </Button>
              </Link>
              <Link href={SIGNUP_ROUTES.worker}>
                <Button size="sm" className="rounded-full">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
