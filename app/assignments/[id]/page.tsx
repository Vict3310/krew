import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { AssignmentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VenueNavigator from "@/components/venue/venue-navigator";
import { requireUser } from "@/lib/auth";
import { getWorkerAssignmentDetail } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { assignmentStatusLabel, assignmentStatusTone } from "@/lib/status";

export const dynamic = "force-dynamic";

/** Statuses where the worker is expected at the venue. */
const ACTIVE_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.ASSIGNED,
  AssignmentStatus.CONFIRMED,
  AssignmentStatus.COMPLETED,
];

/**
 * Everything a worker needs to answer: where is my event, how do I get there,
 * which entrance, and what happens when I arrive.
 *
 * Authorization is enforced here on the server: the query is scoped to the
 * signed-in worker, so another worker's assignment id resolves to a 404 rather
 * than to someone else's event details.
 *
 * A future secure check-in belongs in its own route with its own verification;
 * this page deliberately claims nothing about attendance, and the read-only
 * attendance block below only ever reports records that already exist.
 */
export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const assignment = await getWorkerAssignmentDetail(id, user.id);
  if (!assignment) notFound();

  const shift = assignment.shift;
  const isActive = ACTIVE_STATUSES.includes(assignment.status);
  const coordinates = { latitude: shift.latitude, longitude: shift.longitude };
  const approximate = shift.locationPrecision === "APPROXIMATE";
  const hasCoordinates = typeof shift.latitude === "number" && typeof shift.longitude === "number";

  const addressLines = [shift.venueAddress?.trim(), shift.venue, [shift.location].filter(Boolean).join("")]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .filter((value, index, all) => all.indexOf(value) === index);

  const organizerName = shift.organizer?.name ?? shift.organizer?.username ?? "Your organizer";
  const organizerPhone = shift.organizer?.organizerProfile?.phone ?? null;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/my-shifts" className="inline-flex items-center gap-1.5 text-sm text-[#5B6178] hover:text-[#0B1020]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          My shifts
        </Link>
        <Badge variant={assignmentStatusTone(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge>
      </div>

      <div className="rounded-[28px] border border-[#E6E7EF] bg-white p-6 shadow-[0_16px_38px_rgba(11,16,32,0.06)]">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">{shift.category} · event details</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1020]">{shift.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#5B6178]">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
            {formatDate(shift.shiftDate)}
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
            {shift.startTime}–{shift.endTime}
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
            {organizerName}
          </span>
          <span className="font-medium text-[#0B1020]">{formatCurrency(shift.compensation)}</span>
        </div>
      </div>

      {!isActive ? (
        <div role="alert" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-medium text-amber-900">This assignment is no longer active</p>
            <p className="mt-1 text-sm text-amber-900">
              {assignment.status === AssignmentStatus.CANCELLED
                ? "It was cancelled, so navigation and arrival details are no longer offered. Contact the organizer if you believe this is wrong."
                : "Navigation is available for active assignments only."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Where */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#5B3DF5]" aria-hidden="true" />
                Where your event is
              </CardTitle>
              <CardDescription>
                {hasCoordinates
                  ? approximate
                    ? "The organizer marked this pin as approximate — confirm the entrance when you arrive."
                    : "Confirmed venue location from the organizer."
                  : "The organizer has not confirmed coordinates for this venue yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-[#0B1020]">{shift.venue}</p>
                {addressLines.map((line) => (
                  <p key={line} className="text-sm text-[#5B6178]">
                    {line}
                  </p>
                ))}
                <p className="text-sm text-[#5B6178]">{shift.location}</p>
              </div>

              {hasCoordinates ? (
                <p className="rounded-xl bg-[#F9F9FC] px-3 py-2 font-mono text-xs text-[#5B6178]">
                  {coordinates.latitude!.toFixed(5)}, {coordinates.longitude!.toFixed(5)}
                  {approximate ? " · approximate pin" : " · confirmed pin"}
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-[#E2E3EC] bg-[#F4F5F8] px-3 py-2 text-xs text-[#5B6178]">
                  No confirmed coordinates. Use the address above and the arrival instructions, and ask your organizer
                  if anything is unclear. Krew never guesses a venue position.
                </p>
              )}

              {/* Arrival instructions */}
              {shift.arrivalInstructions || shift.arrivalContact || shift.arrivalTime ? (
                <div className="rounded-2xl border border-[#E6E7EF] bg-[#F9F9FC] p-4">
                  <p className="text-sm font-medium text-[#0B1020]">When you arrive</p>
                  {shift.arrivalTime ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5B6178]">
                      <Clock3 className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
                      Aim to arrive by {shift.arrivalTime}
                    </p>
                  ) : null}
                  {shift.arrivalInstructions ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-[#5B6178]">{shift.arrivalInstructions}</p>
                  ) : null}
                  {shift.arrivalContact ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5B6178]">
                      <Phone className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />
                      {shift.arrivalContact}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#E2E3EC] bg-[#F4F5F8] p-4">
                  <p className="text-sm font-medium text-[#0B1020]">No arrival instructions yet</p>
                  <p className="mt-1 text-sm text-[#5B6178]">
                    The organizer has not added an entrance, reporting point or contact for this shift. You can reach{" "}
                    {organizerName}
                    {organizerPhone ? ` on ${organizerPhone}` : ""} before the event.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to get there */}
          <Card>
            <CardHeader>
              <CardTitle>How to get there</CardTitle>
              <CardDescription>Map, distance and directions for your trip.</CardDescription>
            </CardHeader>
            <CardContent>
              <VenueNavigator
                assignmentId={assignment.id}
                routeEnabled={hasCoordinates}
                venue={{
                  title: shift.title,
                  name: shift.venue,
                  address: shift.venueAddress ?? `${shift.venue}, ${shift.location}`,
                  latitude: shift.latitude,
                  longitude: shift.longitude,
                  approximate,
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Read-only attendance state. This page never records attendance. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#5B3DF5]" aria-hidden="true" />
            Attendance
          </CardTitle>
          <CardDescription>
            Check-in is recorded by the organizer. Opening this page or starting navigation does not mark you as
            arrived.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[#5B6178]">
          {assignment.attendance.length === 0 ? (
            <p>No attendance has been recorded for this assignment yet.</p>
          ) : (
            assignment.attendance.map((record) => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F9F9FC] p-3">
                <span className="font-medium text-[#0B1020]">{record.status}</span>
                <span>
                  {record.checkInAt ? `Checked in ${formatDate(record.checkInAt)}` : "Not checked in"}
                  {record.checkOutAt ? ` · out ${formatDate(record.checkOutAt)}` : ""}
                </span>
              </div>
            ))
          )}
          <p className="pt-2 text-xs text-[#8A90A6]">
            {organizerName} manages attendance for this shift.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
        <Link href={`/shifts/${shift.id}`}>
          <Button variant="outline">View the original shift</Button>
        </Link>
      </div>
    </main>
  );
}
