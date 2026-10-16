import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { assignmentStatusLabel, assignmentStatusTone } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function MyShiftsPage() {
  const user = await requireUser();
  const assignments = await prisma.shiftAssignment.findMany({
    where: { userId: user.id },
    include: { shift: true },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>My assigned shifts</CardTitle>
            <CardDescription>Confirmed roles and shift timing for current bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.length === 0 ? (
              <p className="text-sm text-[#5B6178]">No active assignments yet.</p>
            ) : (
              assignments.map((assignment: (typeof assignments)[number]) => (
                <div key={assignment.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xl font-semibold text-[#0B1020]">{assignment.shift.title}</p>
                      <p className="text-sm text-[#5B6178]">{assignment.shift.location} · {assignment.shift.venue}</p>
                    </div>
                    <Badge variant={assignmentStatusTone(assignment.status)}>{assignmentStatusLabel(assignment.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[#5B6178]">
                      {formatDate(assignment.shift.shiftDate)} · {assignment.shift.startTime}–{assignment.shift.endTime}
                    </p>
                    <Link href={`/assignments/${assignment.id}`}>
                      <Button variant="outline" size="sm">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        Venue &amp; directions
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
