import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardCheck,
  Landmark,
  Search,
  ShieldCheck,
  Users,
  UserRoundCheck,
} from "lucide-react";

import { KrewLogo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND, SIGNUP_ROUTES } from "@/lib/brand";
import { getPlatformStats, getPublicShifts } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const faqs = [
  {
    question: "How does Krew match workers to shifts?",
    answer:
      "Organizers publish a staffing request with the role, venue, date, pay and the number of people needed. Workers browse open requests, apply with a short note, and organizers review applicants in one place before confirming who is on the crew.",
  },
  {
    question: "Do I need experience to apply?",
    answer:
      "You decide what to apply for. Add your relevant experience to your profile so organizers can see what you have done, and apply to any shift where you meet the listed requirements.",
  },
  {
    question: "How and when do I get paid?",
    answer:
      "Pay per shift is listed on every request before you apply, so there is no guessing. Payout records move through explicit statuses, and your earnings page only counts payouts an organizer has actually marked as completed.",
  },
  {
    question: "Is Krew built for event teams in Nigeria?",
    answer:
      "Yes. Amounts are shown in Nigerian naira, locations and venues are Nigeria-based, and the workflow is built around how event staffing actually runs on the ground.",
  },
];

const workerSteps = [
  { icon: Search, title: "Find a shift", body: "Browse open staffing requests with venue, date, pay and requirements shown up front." },
  { icon: ClipboardCheck, title: "Apply", body: "Send a short application. You can see its real status at any time." },
  { icon: UserRoundCheck, title: "Get confirmed", body: "When an organizer accepts you, the assignment appears in your dashboard." },
  { icon: Landmark, title: "Work and get paid", body: "Check in, complete the shift, and track payout records per event." },
];

const organizerSteps = [
  { icon: CalendarClock, title: "Publish the need", body: "Describe the role, venue, date, pay and how many crew you need." },
  { icon: Users, title: "Collect applicants", body: "Applications land in one review queue with each worker's profile." },
  { icon: ShieldCheck, title: "Confirm your crew", body: "Accept the people you want. Confirms are capped at your available positions." },
  { icon: ClipboardCheck, title: "Run the event", body: "Track who is confirmed and close out the staffing once the event is done." },
];

async function loadLandingData() {
  try {
    const [stats, shifts] = await Promise.all([getPlatformStats(), getPublicShifts()]);
    return { stats, shifts: shifts.slice(0, 2) };
  } catch {
    return { stats: null, shifts: [] };
  }
}

export default async function HomePage() {
  const { stats, shifts } = await loadLandingData();
  const hasActivity = Boolean(stats && (stats.organizers > 0 || stats.openShifts > 0));

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      <main>
        <section className="krew-wash relative border-b border-[var(--line)]">
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-8 lg:pt-20">
            <div className="mx-auto max-w-4xl text-center">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--krew-violet)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--krew-violet)]" />
                {BRAND.tagline}
              </p>

              <h1 className="mx-auto max-w-4xl text-[2.75rem] font-light leading-[0.96] tracking-[-0.045em] text-[var(--krew-ink)] md:text-6xl lg:text-7xl">
                Great events start with
                <span className="font-display-serif italic text-[var(--krew-violet)]"> the right people.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)] md:text-xl">
                Find event work, build your experience, or assemble a reliable team. {BRAND.name} brings event workers
                and organizers together in one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href={SIGNUP_ROUTES.worker}>
                  <Button size="lg" className="rounded-full px-7">
                    Find event work <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={SIGNUP_ROUTES.organizer}>
                  <Button variant="outline" size="lg" className="rounded-full border-[var(--line)] bg-white px-7">
                    Hire event staff
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-medium text-[var(--krew-violet)] underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>

            {/* What the product actually does, on both sides of the marketplace. */}
            <div className="mx-auto mt-14 max-w-6xl">
              <div className="soft-panel overflow-hidden rounded-[28px] p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] bg-[var(--krew-navy-deep)] p-6 text-white">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#c3c6e8]">For organizers</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.02em]">One queue for every applicant</p>
                    <p className="mt-2 text-sm text-[#d6d9f0]">
                      See who applied, what they have done, and confirm exactly the number of crew you need.
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)] p-6">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">For workers</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--krew-ink)]">
                      Pay shown before you apply
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Every request lists venue, date, shift hours and pay per person — no guessing, no hidden terms.
                    </p>
                  </div>
                </div>

                {/* Live preview: real listings straight from the marketplace. */}
                <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Open right now</p>
                      <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--krew-ink)]">
                        Live shifts on {BRAND.name}
                      </h2>
                    </div>
                    <Badge className="w-fit rounded-full bg-[#edeaff] text-[var(--krew-violet)]">Real listings</Badge>
                  </div>

                  {shifts.length > 0 ? (
                    <ul className="mt-4 grid gap-3 md:grid-cols-2">
                      {shifts.map((shift) => (
                        <li key={shift.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-[var(--krew-ink)]">{shift.title}</p>
                            <p className="shrink-0 text-sm font-semibold text-[var(--krew-violet)]">
                              {formatCurrency(shift.compensation)}
                            </p>
                          </div>
                          <p className="mt-1.5 text-sm text-[var(--muted)]">
                            {shift.venue} · {shift.location}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {formatDate(shift.shiftDate)} · {shift.startTime}–{shift.endTime}
                          </p>
                          <p className="mt-2 text-xs text-[var(--muted-soft)]">
                            {shift.requiredStaff} crew needed · {shift._count.applications} applied
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
                      No staffing requests are published this minute. This panel fills itself from the live
                      marketplace — if you organize events, yours would appear here.
                    </p>
                  )}

                  <Link
                    href="/shifts"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--krew-violet)]"
                  >
                    Browse the marketplace <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Choose a side of the marketplace. */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card id="workers" className="scroll-mt-20">
              <CardHeader>
                <BriefcaseBusiness className="mb-3 h-7 w-7 text-[var(--krew-violet)]" aria-hidden="true" />
                <CardTitle>If you want to work</CardTitle>
                <CardDescription>Pick up event shifts that fit your schedule.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm text-[var(--muted)]">
                  {[
                    "Browse open shifts with pay shown up front",
                    "Apply in a minute and track the real status",
                    "See your confirmed assignments and schedule",
                    "Track payout records per completed event",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--krew-violet-bright)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={SIGNUP_ROUTES.worker}>
                  <Button className="w-full">Create a worker account</Button>
                </Link>
              </CardContent>
            </Card>

            <Card id="organizers" className="scroll-mt-20">
              <CardHeader>
                <Users className="mb-3 h-7 w-7 text-[var(--krew-violet)]" aria-hidden="true" />
                <CardTitle>If you run events</CardTitle>
                <CardDescription>Staff your event without chasing people on WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm text-[var(--muted)]">
                  {[
                    "Publish a staffing request in one form",
                    "Review applicants with their profiles side by side",
                    "Confirm crew up to your headcount limit",
                    "Track confirmed staff and payout records",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--krew-violet-bright)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={SIGNUP_ROUTES.organizer}>
                  <Button variant="secondary" className="w-full">Create an organizer account</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How the workflow runs, per role. */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-[var(--line)] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 md:px-8">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">How {BRAND.name} works</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-light tracking-[-0.04em] text-[var(--krew-ink)] md:text-4xl">
              One marketplace, two ways to use it.
            </h2>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--krew-violet)]">For workers</p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--krew-ink)]">
                  From browsing to paid
                </h3>
                <div className="mt-6 space-y-3">
                  {workerSteps.map((step) => (
                    <div key={step.title} className="flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
                      <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--krew-violet)]" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-[var(--krew-ink)]">{step.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--krew-violet)]">For organizers</p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--krew-ink)]">
                  From request to crew
                </h3>
                <div className="mt-6 space-y-3">
                  {organizerSteps.map((step) => (
                    <div key={step.title} className="flex gap-4 rounded-2xl border border-[var(--line)] bg-[var(--background)] p-4">
                      <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--krew-violet)]" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-[var(--krew-ink)]">{step.title}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust: only what the system genuinely does. */}
        <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Trust and transparency</p>
              <h2 className="mt-3 text-3xl font-light tracking-[-0.04em] text-[var(--krew-ink)] md:text-4xl">
                No inflated numbers. No fake profiles.
              </h2>
              <p className="mt-4 max-w-xl text-[var(--muted)]">
                {BRAND.name} shows what the platform can actually prove: real published requests, real applications,
                and real assignment records.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                "Pay is shown on a request before anyone applies.",
                "Applications carry explicit statuses, never a vague “pending” badge.",
                "An assignment only appears once an organizer has confirmed it.",
                "Earnings count completed payouts only, not estimates.",
                "Administrator access is never granted through public signup.",
              ].map((item) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--krew-violet)]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Live platform state. */}
        <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
          <div className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-soft)] p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Platform today</p>
            {hasActivity ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-4xl font-semibold text-[var(--krew-ink)]">{stats!.openShifts}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Open shifts published</p>
                </div>
                <div>
                  <p className="text-4xl font-semibold text-[var(--krew-ink)]">{stats!.workers}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Active worker accounts</p>
                </div>
                <div>
                  <p className="text-4xl font-semibold text-[var(--krew-ink)]">{stats!.organizers}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">Active organizer accounts</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 max-w-2xl text-[var(--muted)]">
                {BRAND.name} is early. There are no published shifts to browse right now — if you run events, publish
                the first staffing request, and if you want to work, create a profile so you are ready when requests go
                live.
              </p>
            )}
            <p className="mt-5 text-xs text-[var(--muted-soft)]">
              These numbers are read live from the {BRAND.name} database. We do not display estimated or illustrative
              figures.
            </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-20 md:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">FAQ</p>
            <h2 className="mt-4 text-4xl font-light tracking-[-0.05em] text-[var(--krew-ink)] md:text-5xl">
              Questions before you start
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-[var(--line)] bg-white p-5"
                open={item.question === faqs[0].question}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-medium text-[var(--krew-ink)]">
                  {item.question}
                  <span className="rounded-full border border-[var(--line)] p-2 text-[var(--krew-violet)] transition-transform group-open:rotate-90">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-sm">
              <KrewLogo />
              <p className="mt-4 text-sm text-[var(--muted)]">{BRAND.tagline}</p>
              <p className="mt-2 text-sm text-[var(--muted-soft)]">{BRAND.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
              <div>
                <p className="font-medium text-[var(--krew-ink)]">For workers</p>
                <ul className="mt-3 space-y-2 text-[var(--muted)]">
                  <li><Link href={SIGNUP_ROUTES.worker} className="transition hover:text-[var(--krew-ink)]">Find event work</Link></li>
                  <li><Link href="/shifts" className="transition hover:text-[var(--krew-ink)]">Browse shifts</Link></li>
                  <li><Link href="/auth/login" className="transition hover:text-[var(--krew-ink)]">Sign in</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-[var(--krew-ink)]">For organizers</p>
                <ul className="mt-3 space-y-2 text-[var(--muted)]">
                  <li><Link href={SIGNUP_ROUTES.organizer} className="transition hover:text-[var(--krew-ink)]">Hire event staff</Link></li>
                  <li><Link href="/#how-it-works" className="transition hover:text-[var(--krew-ink)]">How it works</Link></li>
                  <li><Link href="/auth/login" className="transition hover:text-[var(--krew-ink)]">Organizer sign in</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-[var(--krew-ink)]">Product</p>
                <ul className="mt-3 space-y-2 text-[var(--muted)]">
                  <li><a href="#workers" className="transition hover:text-[var(--krew-ink)]">For workers</a></li>
                  <li><a href="#organizers" className="transition hover:text-[var(--krew-ink)]">For organizers</a></li>
                  <li><a href="#faq" className="transition hover:text-[var(--krew-ink)]">FAQ</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted-soft)] sm:flex-row sm:items-center sm:justify-between">
            <p>© {BRAND.year} {BRAND.name}</p>
            <p>Event staffing, coordinated.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
