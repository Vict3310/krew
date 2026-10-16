import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, ShieldCheck, UserCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getOrganizerDashboard, isProfileComplete } from "@/lib/data";
import { escrowStatusLabel, escrowStatusTone } from "@/lib/escrow";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);

  const { user: account, shifts, pendingApplications, confirmedAssignments, openPositions } =
    await getOrganizerDashboard(user.id);

  // Organizers must finish setup before they can publish; admins skip this.
  if (user.role === "ORGANIZER" && !isProfileComplete({ role: user.role, organizerProfile: account?.organizerProfile })) {
    redirect("/onboarding");
  }

  const upcoming = shifts
    .filter((shift) => shift.status === "PUBLISHED")
    .slice(0, 4);

  const totalCommitted = shifts
    .filter((shift) => shift.status === "PUBLISHED" || shift.status === "COMPLETED")
    .reduce((sum, shift) => sum + shift.compensation * shift._count.assignments, 0);

  const fundedShifts = shifts.filter((shift) => shift.fundingStatus === "FUNDED");
  const escrowedTotal = fundedShifts.reduce((sum, shift) => sum + shift.escrowAmount, 0);
  const releasedCount = shifts.filter((shift) => shift.fundingStatus === "RELEASED").length;

  const summary = [
    { icon: ClipboardList, label: "Published shifts", value: String(shifts.filter((s) => s.status === "PUBLISHED").length), hint: `${shifts.length} total created` },
    { icon: UserCheck, label: "Applicants to review", value: String(pendingApplications), hint: pendingApplications ? "Waiting on your decision" : "You are all caught up" },
    { icon: Users, label: "Confirmed crew", value: String(confirmedAssignments), hint: `${openPositions} positions still open` },
    { icon: CalendarClock, label: "Committed pay", value: formatCurrency(totalCommitted), hint: "Pay × confirmed crew" },
    { icon: ShieldCheck, label: "Held in escrow", value: formatCurrency(escrowedTotal), hint: `${fundedShifts.length} funded · ${releasedCount} released` },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#E6E7EF] bg-white p-6 shadow-[0_16px_38px_rgba(11,16,32,0.06)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Organizer hub</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">
            {account?.organizerProfile?.companyName ?? "Manage event operations"}
          </h1>
          <p className="mt-1 text-sm text-[#5B6178]">
            Publish staffing requests, review real applicants and confirm your crew.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/organizer/shifts/new"><Button>Post a shift</Button></Link>
          <Link href="/organizer/shifts"><Button variant="secondary">View roster</Button></Link>
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <item.icon className="h-6 w-6 text-[#5B3DF5]" aria-hidden="true" />
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-[#0B1020]">{item.value}</p>
              <CardDescription className="mt-1">{item.hint}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Open staffing requests</CardTitle>
          <CardDescription>Live requests and how many crew are confirmed so far.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E7EF] bg-[#FAFAFD] p-8 text-center">
              <p className="text-base font-semibold text-[#0B1020]">No shifts published yet</p>
              <p className="mt-2 text-sm text-[#5B6178]">Publish your first staffing request to start receiving applications.</p>
              <Link href="/organizer/shifts/new" className="mt-5 inline-block"><Button>Post a shift</Button></Link>
            </div>
          ) : (
            upcoming.map((shift) => (
              <div key={shift.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#0B1020]">{shift.title}</p>
                    <p className="text-sm text-[#5B6178]">{shift.venue}, {shift.location} · {formatDate(shift.shiftDate)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{shift._count.applications} applied</Badge>
                    <Badge>{shift._count.assignments}/{shift.requiredStaff} confirmed</Badge>
                    <Badge variant={escrowStatusTone(shift.fundingStatus)}>{escrowStatusLabel(shift.fundingStatus)}</Badge>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link href={`/organizer/shifts/${shift.id}/review`}>
                    <Button variant="outline" size="sm">Review applicants</Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
