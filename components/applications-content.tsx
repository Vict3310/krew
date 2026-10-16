import Link from "next/link";
import { CalendarClock, MapPin, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { applicationStatusLabel, applicationStatusTone } from "@/lib/status";

export type ApplicationRow = {
  id: string;
  status: string;
  coverNote: string | null;
  createdAt: string;
  shiftId: string;
  shiftTitle: string;
  shiftLocation: string;
  shiftVenue: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  compensation: number;
  organizerName: string;
};

export default function ApplicationsContent({ applications }: { applications: ApplicationRow[] }) {
  const pending = applications.filter((application) => application.status === "PENDING").length;
  const accepted = applications.filter((application) => application.status === "ACCEPTED").length;
  const rejected = applications.filter((application) => application.status === "REJECTED").length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Applications</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">My applications</h1>
        <p className="mt-2 text-sm text-[#5B6178]">
          {applications.length} total · {pending} pending · {accepted} accepted · {rejected} not selected
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application history</CardTitle>
          <CardDescription>Each status below reflects the organizer&apos;s actual decision.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E7EF] bg-[#FAFAFD] p-8 text-center">
              <p className="text-base font-semibold text-[#0B1020]">No applications yet</p>
              <p className="mt-2 text-sm text-[#5B6178]">Browse open shifts and apply — your applications will appear here.</p>
              <Link href="/shifts" className="mt-5 inline-block"><Button>Browse open shifts</Button></Link>
            </div>
          ) : (
            applications.map((application) => (
              <div key={application.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#0B1020]">{application.shiftTitle}</p>
                    <p className="mt-1 text-sm text-[#5B6178]">with {application.organizerName}</p>
                  </div>
                  <Badge variant={applicationStatusTone(application.status)}>
                    {applicationStatusLabel(application.status)}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-[#5B6178] sm:grid-cols-2">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />{application.shiftVenue}, {application.shiftLocation}</span>
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />{formatDate(application.shiftDate)} · {application.startTime}–{application.endTime}</span>
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-[#5B3DF5]" aria-hidden="true" />{formatCurrency(application.compensation)}</span>
                  <span>Applied {formatDate(application.createdAt)}</span>
                </div>

                {application.status === "ACCEPTED" ? (
                  <p className="mt-3 rounded-xl border border-[#CDEBD8] bg-[#ECFAF1] p-3 text-sm text-[#141B41]">
                    You are confirmed for this shift. See the details on <Link href="/my-shifts" className="underline">My shifts</Link>.
                  </p>
                ) : null}

                <div className="mt-3 flex justify-end">
                  <Link href={`/shifts/${application.shiftId}`}>
                    <Button variant="outline" size="sm">View shift</Button>
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
