"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { deleteShift } from "@/lib/actions/shifts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { shiftStatusLabel, shiftStatusTone } from "@/lib/status";

export type OrganizerShiftRow = {
  id: string;
  title: string;
  status: string;
  location: string;
  venue: string;
  shiftDate: string;
  compensation: number;
  requiredStaff: number;
  applicationsCount: number;
  assignmentsCount: number;
};

export default function ShiftList({ shifts }: { shifts: OrganizerShiftRow[] }) {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  function remove(shiftId: string, title: string) {
    startTransition(async () => {
      const result = await deleteShift(shiftId);
      setConfirming(null);
      if (!result.ok) {
        push({ title: "Could not delete shift", description: result.error, variant: "error" });
        return;
      }
      push({ title: "Shift deleted", description: `“${title}” and its applications were removed.`, variant: "success" });
    });
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {shifts.map((shift) => (
        <Card key={shift.id} className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>{shift.title}</CardTitle>
              <Badge variant={shiftStatusTone(shift.status)}>{shiftStatusLabel(shift.status)}</Badge>
            </div>
            <CardDescription>{shift.venue}, {shift.location} · {formatDate(shift.shiftDate)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-[#F4F4F9] p-2">
                <p className="text-lg font-semibold text-[#0B1020]">{shift.applicationsCount}</p>
                <p className="text-[11px] text-[#8A90A6]">Applied</p>
              </div>
              <div className="rounded-xl bg-[#F4F4F9] p-2">
                <p className="text-lg font-semibold text-[#0B1020]">{shift.assignmentsCount}/{shift.requiredStaff}</p>
                <p className="text-[11px] text-[#8A90A6]">Confirmed</p>
              </div>
              <div className="rounded-xl bg-[#F4F4F9] p-2">
                <p className="text-lg font-semibold text-[#0B1020]">{formatCurrency(shift.compensation)}</p>
                <p className="text-[11px] text-[#8A90A6]">Per person</p>
              </div>
            </div>

            {confirming === shift.id ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">Delete this shift and remove all its applications?</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(shift.id, shift.title)}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)} disabled={pending}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="mt-auto flex gap-2">
                <Link href={`/organizer/shifts/${shift.id}/review`} className="flex-1">
                  <Button variant="secondary" className="w-full"><Users className="h-4 w-4" /> Review</Button>
                </Link>
                <Link href={`/organizer/shifts/new?edit=${shift.id}`} className="flex-1">
                  <Button variant="outline" className="w-full"><Pencil className="h-4 w-4" /> Edit</Button>
                </Link>
                <Button variant="ghost" aria-label={`Delete ${shift.title}`} onClick={() => setConfirming(shift.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
