import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarClock, Clock3, MapPin, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { applicationStatusLabel, applicationStatusTone, assignmentStatusLabel, assignmentStatusTone } from "@/lib/status";

export type DashboardApplication = {
  id: string;
  status: string;
  createdAt: string;
  shiftId: string;
  shiftTitle: string;
  shiftLocation: string;
  shiftDate: string;
  compensation: number;
};

export type DashboardAssignment = {
  id: string;
  shiftId: string;
  status: string;
  shiftTitle: string;
  shiftLocation: string;
  shiftVenue: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
};

export type DashboardShift = {
  id: string;
  title: string;
  location: string;
  category: string;
  shiftDate: string;
  compensation: number;
};

export default function DashboardContent({
  name,
  profile,
  stats,
  applications,
  assignments,
  recommended,
}: {
  name: string;
  profile: { city: string | null; availability: string | null; skills: string[] };
  stats: {
    applications: number;
    pending: number;
    accepted: number;
    paid: number;
    pendingPay: number;
  };
  applications: DashboardApplication[];
  assignments: DashboardAssignment[];
  recommended: DashboardShift[];
}) {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 rounded-[28px] border border-[#E6E7EF] bg-white p-6 shadow-[0_16px_38px_rgba(11,16,32,0.06)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Worker dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Welcome back, {name}</h1>
          <p className="mt-1 text-sm text-[#5B6178]">
            {profile.city ? `Based in ${profile.city}` : "Add your city to your profile"}
            {profile.availability ? ` · ${profile.availability}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/shifts"><Button>Browse shifts</Button></Link>
          <Link href="/profile"><Button variant="secondary">Edit profile</Button></Link>
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><BriefcaseBusiness className="h-6 w-6 text-[#5B3DF5]" aria-hidden="true" /><CardTitle>Applications</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.applications}</p>
            <CardDescription className="mt-1">{stats.pending} awaiting a decision</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Clock3 className="h-6 w-6 text-[#5B3DF5]" aria-hidden="true" /><CardTitle>Confirmed</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.accepted}</p>
            <CardDescription className="mt-1">Accepted assignments</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CalendarClock className="h-6 w-6 text-[#5B3DF5]" aria-hidden="true" /><CardTitle>Upcoming shifts</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{assignments.length}</p>
            <CardDescription className="mt-1">On your schedule</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Wallet className="h-6 w-6 text-[#5B3DF5]" aria-hidden="true" /><CardTitle>Paid out</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(stats.paid)}</p>
            <CardDescription className="mt-1">
              {stats.pendingPay > 0 ? `${formatCurrency(stats.pendingPay)} pending` : "Completed payout records only"}
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your applications</CardTitle>
            <CardDescription>Applications update as organizers review them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E6E7EF] bg-[#FAFAFD] p-6 text-center">
                <p className="text-base font-semibold text-[#0B1020]">You haven&apos;t applied to anything yet</p>
                <p className="mt-2 text-sm text-[#5B6178]">Browse open shifts and send your first application.</p>
                <Link href="/shifts" className="mt-4 inline-block"><Button size="sm">Find a shift</Button></Link>
              </div>
            ) : (
              applications.map((application) => (
                <div key={application.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#0B1020]">{application.shiftTitle}</p>
                    <Badge variant={applicationStatusTone(application.status)}>{applicationStatusLabel(application.status)}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-[#5B6178]">
                    <span>{application.shiftLocation} · {formatDate(application.shiftDate)}</span>
                    <span>{formatCurrency(application.compensation)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-[#8A90A6]">Applied {formatDate(application.createdAt)}</span>
                    <Link href={`/shifts/${application.shiftId}`}>
                      <Button variant="outline" size="sm">View shift <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming assignments</CardTitle>
            <CardDescription>Confirmed shifts on your schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-[#5B6178]">
                No confirmed assignments yet. When an organizer accepts your application it appears here.
              </p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-2xl bg-[#F0EEFF] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[#0B1020]">{assignment.shiftTitle}</p>
                    <Badge variant={assignmentStatusTone(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#5B6178]">{assignment.shiftVenue}, {assignment.shiftLocation}</p>
                  <p className="mt-2 text-xs text-[#8A90A6]">
                    {formatDate(assignment.shiftDate)} · {assignment.startTime}–{assignment.endTime}
                  </p>
                  <Link href={`/assignments/${assignment.id}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      Venue &amp; directions
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Open shifts for you</CardTitle>
          <CardDescription>Fresh staffing requests from organizers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommended.length === 0 ? (
            <p className="text-sm text-[#5B6178]">No shifts are live right now. Check back soon.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {recommended.map((shift) => (
                <div key={shift.id} className="rounded-2xl border border-[#E9EAF2] bg-white p-4">
                  <p className="font-semibold text-[#0B1020]">{shift.title}</p>
                  <p className="mt-1 text-sm text-[#5B6178]">{shift.location} · {shift.category}</p>
                  <p className="mt-2 text-sm text-[#5B6178]">{formatDate(shift.shiftDate)} · {formatCurrency(shift.compensation)}</p>
                  <Link href={`/shifts/${shift.id}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">View details</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <p className="pt-1 text-xs text-[#8A90A6]">Last refreshed {formatDateTime(new Date())}.</p>
        </CardContent>
      </Card>
    </main>
  );
}
