"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Unlock } from "lucide-react";

import EscrowDepositForm from "@/components/organizer/escrow-deposit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { markShiftCompleted, releaseShiftEscrow } from "@/lib/actions/escrow";
import { escrowStatusLabel, escrowStatusTone } from "@/lib/escrow";
import { formatCurrency, formatDate } from "@/lib/utils";

export type EscrowPanelProps = {
  shiftId: string;
  shiftTitle: string;
  fundingStatus: string;
  escrowAmount: number;
  requiredAmount: number;
  compensation: number;
  crewCount: number;
  shiftDate: string;
  canRelease: boolean;
  releaseHint?: string;
};

/**
 * The money panel on a staffing request.
 *
 * Everything here is simulated — the copy says so plainly rather than implying a
 * real charge — but the states are real: an unfunded shift cannot pay crew, and
 * a funded shift cannot be released before the event is done.
 */
export default function EscrowPanel({
  shiftId,
  shiftTitle,
  fundingStatus,
  escrowAmount,
  requiredAmount,
  compensation,
  crewCount,
  shiftDate,
  canRelease,
  releaseHint,
}: EscrowPanelProps) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const funded = fundingStatus === "FUNDED";
  const released = fundingStatus === "RELEASED";
  const crewPayout = compensation * crewCount;

  function release() {
    setError(null);
    startTransition(async () => {
      const result = await releaseShiftEscrow(shiftId);
      if (!result.ok) {
        setError(result.error ?? "We could not release these funds.");
        push({ title: "Release failed", description: result.error, variant: "error" });
        return;
      }

      push({
        title: "Funds released",
        description:
          result.paidCount && result.paidCount > 0
            ? `${formatCurrency(result.amount ?? 0)} paid out to ${result.paidCount} crew member${result.paidCount === 1 ? "" : "s"}.`
            : "No confirmed crew to pay — the shift is now closed out.",
        variant: "success",
      });
      router.refresh();
    });
  }

  function complete() {
    setError(null);
    startTransition(async () => {
      const result = await markShiftCompleted(shiftId);
      if (!result.ok) {
        setError(result.error ?? "We could not update this shift.");
        push({ title: "Could not complete shift", description: result.error, variant: "error" });
        return;
      }
      push({ title: "Event marked complete", description: "You can now release the held funds to your crew.", variant: "success" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#5B3DF5]" aria-hidden="true" /> Crew escrow
            </CardTitle>
            <CardDescription>
              Hold the crew cost before the event, then release it when the work is done.
            </CardDescription>
          </div>
          <Badge variant={escrowStatusTone(fundingStatus)}>{escrowStatusLabel(fundingStatus)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#F9F9FC] p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A90A6]">Crew cost</p>
            <p className="mt-1 text-lg font-semibold text-[#0B1020]">{formatCurrency(requiredAmount)}</p>
            <p className="text-xs text-[#8A90A6]">{formatCurrency(compensation)} × {crewCount || 0} confirmed</p>
          </div>
          <div className="rounded-2xl bg-[#F9F9FC] p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A90A6]">In escrow</p>
            <p className="mt-1 text-lg font-semibold text-[#0B1020]">{formatCurrency(escrowAmount)}</p>
            <p className="text-xs text-[#8A90A6]">Event {formatDate(shiftDate)}</p>
          </div>
          <div className="rounded-2xl bg-[#F9F9FC] p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8A90A6]">Payout per crew</p>
            <p className="mt-1 text-lg font-semibold text-[#0B1020]">{formatCurrency(compensation)}</p>
            <p className="text-xs text-[#8A90A6]">{crewPayout > 0 ? `${formatCurrency(crewPayout)} total` : "No crew confirmed yet"}</p>
          </div>
        </div>

        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {fundingStatus === "UNFUNDED" ? (
          <EscrowDepositForm shiftId={shiftId} shiftTitle={shiftTitle} amount={requiredAmount} />
        ) : null}

        {funded ? (
          <div className="space-y-4 rounded-2xl border border-[#CDEBD8] bg-[#ECFAF1] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-[#141B41]">
              <CheckCircle2 className="h-4 w-4 text-[#2E7D5B]" aria-hidden="true" />
              {formatCurrency(escrowAmount)} is held for this crew.
            </p>
            <p className="text-sm text-[#5B6178]">
              {canRelease
                ? `Release it to ${crewCount} confirmed ${crewCount === 1 ? "crew member" : "crew members"} now that the event is done.`
                : releaseHint ?? "Funds unlock once the event has happened."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={release} disabled={pending || !canRelease} title={!canRelease ? releaseHint : undefined}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />} Release funds to crew
              </Button>
              {!canRelease ? (
                <Button variant="secondary" onClick={complete} disabled={pending}>
                  Mark event as complete
                </Button>
              ) : null}
            </div>
            {crewCount === 0 ? (
              <p className="text-xs text-[#8A6116]">No crew are confirmed yet, so releasing now would pay out nothing.</p>
            ) : null}
          </div>
        ) : null}

        {released ? (
          <div className="rounded-2xl border border-[#E6E7EF] bg-[#F9F9FC] p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-[#0B1020]">
              <CheckCircle2 className="h-4 w-4 text-[#2E7D5B]" aria-hidden="true" /> Funds released
            </p>
            <p className="mt-1 text-sm text-[#5B6178]">
              {formatCurrency(escrowAmount)} was paid out to your confirmed crew. Their earnings show it as completed pay.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
