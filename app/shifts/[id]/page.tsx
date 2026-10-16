import Link from "next/link";
import { CalendarClock, MapPin, ShieldCheck, Users, Wallet } from "lucide-react";

import ApplyShiftButton from "@/components/apply-shift-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAssignmentCountsByOpening, getShiftApplication, getShiftById } from "@/lib/data";
import { currentTimeMs, formatCurrency, formatDate } from "@/lib/utils";
import { applicationStatusLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [shift, user] = await Promise.all([getShiftById(id), getCurrentUser()]);

  if (!shift) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-[#0B1020]">Shift not found</h1>
        <p className="mt-3 text-[#5B6178]">This shift may have been removed or the link is incorrect.</p>
        <Link href="/shifts">
          <Button className="mt-6">Back to marketplace</Button>
        </Link>
      </main>
    );
  }

  const [application, filledByOpening] = await Promise.all([
    user ? getShiftApplication(user.id, shift.id) : Promise.resolve(null),
    getActiveAssignmentCountsByOpening(shift.id),
  ]);
  const isOpen = shift.status === "PUBLISHED" && shift.applicationDeadline.getTime() >= currentTimeMs();
  const organizerName = shift.organizer?.name ?? shift.organizer?.username ?? "Event organizer";
  const filled = Object.values(filledByOpening).reduce((sum, count) => sum + count, 0);
  const remaining = Math.max(0, shift.requiredStaff - filled);

  // Shifts created before worker types have no openings; they read as one role
  // built from the shift's own category and headcount.
  const openings =
    shift.openings.length > 0
      ? shift.openings.map((opening) => ({
          id: opening.id,
          role: opening.role,
          headcount: opening.headcount,
          remaining: Math.max(0, opening.headcount - (filledByOpening[opening.id] ?? 0)),
        }))
      : [{ id: null, role: shift.category, headcount: shift.requiredStaff, remaining }];

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
      <div className="rounded-[28px] border border-[#E6E7EF] bg-white p-6 shadow-[0_20px_45px_rgba(11,16,32,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{shift.category}</Badge>
              <Badge variant={isOpen ? "default" : "secondary"}>{isOpen ? "Open for applications" : "Closed"}</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-semibold text-[#0B1020]">{shift.title}</h1>
            <p className="mt-2 text-sm text-[#5B6178]">
              {shift.venue} · {shift.location} · posted by {organizerName}
            </p>
          </div>
          <ApplyShiftButton
            shiftId={shift.id}
            shiftTitle={shift.title}
            initialApplied={Boolean(application)}
            isAuthenticated={Boolean(user)}
            isWorker={user?.role === "WORKER"}
            isOpen={isOpen}
            openings={openings}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Role overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-[#5B6178]">
            <p className="whitespace-pre-line">{shift.description}</p>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Crew wanted</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {openings.map((opening) => (
                  <div key={opening.id ?? opening.role} className="flex items-center justify-between rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                    <span className="flex items-center gap-2 font-medium text-[#0B1020]">
                      <Users className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> {opening.role}
                    </span>
                    <span className="text-xs text-[#5B6178]">
                      {opening.remaining > 0 ? `${opening.remaining} of ${opening.headcount} left` : "Filled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#F0EEFF] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Location</p>
                <p className="mt-2 flex items-center gap-2 font-medium text-[#0B1020]">
                  <MapPin className="h-4 w-4" aria-hidden="true" /> {shift.location}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F0EEFF] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Venue</p>
                <p className="mt-2 font-medium text-[#0B1020]">{shift.venue}</p>
              </div>
              <div className="rounded-2xl bg-[#F0EEFF] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Date</p>
                <p className="mt-2 flex items-center gap-2 font-medium text-[#0B1020]">
                  <CalendarClock className="h-4 w-4" aria-hidden="true" /> {formatDate(shift.shiftDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F0EEFF] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Shift hours</p>
                <p className="mt-2 font-medium text-[#0B1020]">{shift.startTime}–{shift.endTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#5B6178]">
            <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
              <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> Pay per person</span>
              <span className="font-semibold text-[#0B1020]">{formatCurrency(shift.compensation)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> Crew needed</span>
              <span className="font-semibold text-[#0B1020]">{shift.requiredStaff}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
              <span>Still to confirm</span>
              <span className="font-semibold text-[#0B1020]">{remaining} {remaining === 1 ? "position" : "positions"}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
              <span>Applications</span>
              <span className="font-semibold text-[#0B1020]">{shift._count.applications}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#F9F9FC] p-3">
              <span>Apply before</span>
              <span className="font-semibold text-[#0B1020]">{formatDate(shift.applicationDeadline)}</span>
            </div>
            <div className="rounded-2xl bg-[#F9F9FC] p-3">
              <p className="flex items-center gap-2 font-medium text-[#0B1020]">
                <ShieldCheck className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" /> Organizer
              </p>
              <p className="mt-2">{organizerName}</p>
            </div>
            {application ? (
              <div className="rounded-2xl border border-[#CDEBD8] bg-[#ECFAF1] p-3">
                <p className="font-medium text-[#141B41]">Your application</p>
                <p className="mt-1 text-[#5B6178]">
                  Status: <span className="font-semibold">{applicationStatusLabel(application.status)}</span> · submitted {formatDate(application.createdAt)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
