"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Loader2, MapPin, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { decideApplication } from "@/lib/actions/shifts";
import { formatDate } from "@/lib/utils";
import { applicationStatusLabel, applicationStatusTone } from "@/lib/status";

export type ReviewOpening = {
  id: string;
  role: string;
  headcount: number;
  confirmed: number;
};

export type ApplicantRow = {
  id: string;
  status: string;
  coverNote: string | null;
  createdAt: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  city: string | null;
  availability: string | null;
  skills: string[];
  bio: string | null;
  requestedRole: string | null;
  openingId: string | null;
};

export default function ApplicantReview({
  shiftId,
  shiftTitle,
  requiredStaff,
  confirmed,
  openings,
  applications,
}: {
  shiftId: string;
  shiftTitle: string;
  requiredStaff: number;
  confirmed: number;
  openings: ReviewOpening[];
  applications: ApplicantRow[];
}) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(applications.map((application) => [application.id, application.status])),
  );
  const [filled, setFilled] = useState(confirmed);
  // Confirmed crew per role, mirrored locally so the per-role "full" state
  // updates the moment an applicant is accepted.
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>(
    Object.fromEntries(openings.map((opening) => [opening.id, opening.confirmed])),
  );

  const positionsLeft = Math.max(0, requiredStaff - filled);

  /**
   * The role an acceptance will fill: the role the worker asked for when it has
   * room, otherwise the first role that still needs people. Mirrors the server.
   */
  function targetOpening(application: ApplicantRow): ReviewOpening | undefined {
    if (application.openingId) {
      const requested = openings.find((opening) => opening.id === application.openingId);
      if (requested && (roleCounts[requested.id] ?? 0) < requested.headcount) return requested;
    }
    return openings.find((opening) => (roleCounts[opening.id] ?? 0) < opening.headcount);
  }

  function decide(application: ApplicantRow, decision: "ACCEPTED" | "REJECTED") {
    setBusyId(application.id);
    startTransition(async () => {
      const target = decision === "ACCEPTED" ? targetOpening(application) : undefined;
      const result = await decideApplication({ applicationId: application.id, decision });
      setBusyId(null);

      if (!result.ok) {
        push({ title: "Action not applied", description: result.error ?? "Please try again.", variant: "error" });
        return;
      }

      setStatuses((current) => ({ ...current, [application.id]: decision }));
      if (decision === "ACCEPTED") {
        setFilled((current) => current + 1);
        if (target) {
          setRoleCounts((current) => ({ ...current, [target.id]: (current[target.id] ?? 0) + 1 }));
        }
      }

      push({
        title: decision === "ACCEPTED" ? "Applicant confirmed" : "Applicant rejected",
        description:
          decision === "ACCEPTED"
            ? `${application.name} now appears in your confirmed crew${target ? ` as ${target.role}` : ""}.`
            : `${application.name} has been notified via their applications list.`,
        variant: decision === "ACCEPTED" ? "success" : "info",
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Applicants</CardTitle>
            <CardDescription>
              {applications.length} {applications.length === 1 ? "application" : "applications"} for {shiftTitle}
            </CardDescription>
          </div>
          <Badge variant={positionsLeft === 0 ? "secondary" : "default"}>
            {filled}/{requiredStaff} confirmed · {positionsLeft} left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications.length === 0 ? (
          <p className="text-sm text-[#5B6178]">
            No workers have applied yet. Applications appear here as soon as they arrive.
          </p>
        ) : (
          applications.map((application) => {
            const status = statuses[application.id] ?? application.status;
            const isAccepted = status === "ACCEPTED";
            const isRejected = status === "REJECTED";
            const busy = busyId === application.id && pending;
            const target = targetOpening(application);
            const canAccept = !isAccepted && positionsLeft > 0 && Boolean(target);

            return (
              <div key={application.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FBFBFE] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-[#0B1020]">{application.name}</p>
                    <p className="text-sm text-[#5B6178]">@{application.username} · {application.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#8A90A6]">
                      {application.city ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{application.city}</span>
                      ) : null}
                      {application.availability ? <span>Available: {application.availability}</span> : null}
                      <span>Applied {formatDate(application.createdAt)}</span>
                    </div>
                    {application.requestedRole ? (
                      <p className="mt-2 text-xs text-[#5B6178]">
                        Wants: <span className="font-medium text-[#3B2BA8]">{application.requestedRole}</span>
                        {!isAccepted && target && target.role !== application.requestedRole ? (
                          <span> · confirming would fill {target.role} instead</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={applicationStatusTone(status)}>{applicationStatusLabel(status)}</Badge>
                </div>

                {application.skills.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {application.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-[#EDEAFF] px-2.5 py-1 text-xs text-[#3B2BA8]">{skill}</span>
                    ))}
                  </div>
                ) : null}

                {application.bio ? (
                  <p className="mt-3 flex gap-2 rounded-2xl bg-[#F5F4FF] p-3 text-sm text-[#5B6178]">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#5B3DF5]" aria-hidden="true" />
                    {application.bio}
                  </p>
                ) : null}

                {application.coverNote ? (
                  <div className="mt-3 rounded-2xl bg-[#F5F4FF] p-3 text-sm text-[#5B6178]">
                    <p className="font-medium text-[#0B1020]">Cover note</p>
                    <p className="mt-1">{application.coverNote}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/organizer/applicants/${application.userId}?shiftId=${encodeURIComponent(shiftId)}`}>
                    <Button variant="outline" size="sm">View full profile</Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => decide(application, "ACCEPTED")}
                    disabled={busy || isAccepted || !canAccept}
                    title={
                      !canAccept && !isAccepted
                        ? positionsLeft === 0
                          ? "All positions are filled"
                          : "This role is already full"
                        : undefined
                    }
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept{target && !isAccepted ? ` as ${target.role}` : ""}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => decide(application, "REJECTED")}
                    disabled={busy || isRejected}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  {!canAccept && !isAccepted ? (
                    <span className="text-xs text-[#8A6116]">
                      {positionsLeft === 0
                        ? `All ${requiredStaff} positions are filled.`
                        : "Every role on this shift is full."}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        {applications.length > 0 ? (
          <p className="text-xs text-[#8A90A6]">
            Confirming an applicant fills the role they asked for when it still has room, and creates their assignment immediately.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
