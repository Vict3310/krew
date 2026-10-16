"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Lock, ShieldCheck, Wallet } from "lucide-react";

import EscrowDepositForm from "@/components/organizer/escrow-deposit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { escrowStatusLabel, escrowStatusTone } from "@/lib/escrow";
import { transactionStatusLabel } from "@/lib/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export type BillingShiftRow = {
  id: string;
  title: string;
  status: string;
  fundingStatus: string;
  escrowAmount: number;
  requiredAmount: number;
  requiredStaff: number;
  compensation: number;
  shiftDate: string;
  fundedAt: string | null;
  releasedAt: string | null;
};

export type BillingDepositRow = {
  id: string;
  amount: number;
  status: string;
  reference: string | null;
  createdAt: string;
  shiftTitle: string | null;
};

export default function BillingView({
  heldInEscrow,
  releasedTotal,
  awaitingDeposit,
  fundedCount,
  releasedCount,
  shifts,
  deposits,
}: {
  heldInEscrow: number;
  releasedTotal: number;
  awaitingDeposit: number;
  fundedCount: number;
  releasedCount: number;
  shifts: BillingShiftRow[];
  deposits: BillingDepositRow[];
}) {
  // Only one deposit form is open at a time, so the page stays readable even
  // when several shifts are waiting on money.
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);

  const needsFunding = shifts.filter((shift) => shift.fundingStatus === "UNFUNDED" && shift.status === "PUBLISHED");
  const heldShifts = shifts.filter((shift) => shift.fundingStatus === "FUNDED");
  const releasedShifts = shifts.filter((shift) => shift.fundingStatus === "RELEASED");

  const summary = [
    { icon: ShieldCheck, label: "Held in escrow", value: formatCurrency(heldInEscrow), hint: `${fundedCount} funded ${fundedCount === 1 ? "shift" : "shifts"}` },
    { icon: CheckCircle2, label: "Released to crew", value: formatCurrency(releasedTotal), hint: `${releasedCount} completed ${releasedCount === 1 ? "shift" : "shifts"}` },
    { icon: Lock, label: "Awaiting deposit", value: formatCurrency(awaitingDeposit), hint: `${needsFunding.length} ${needsFunding.length === 1 ? "shift" : "shifts"} still unfunded` },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-3">
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
          <CardTitle>Shifts waiting on a deposit</CardTitle>
          <CardDescription>
            Hold a shift&apos;s crew cost up front. Confirm crew first if you want to know the exact payout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsFunding.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E7EF] bg-[#FAFAFD] p-8 text-center">
              <p className="text-base font-semibold text-[#0B1020]">Every published shift is funded</p>
              <p className="mt-2 text-sm text-[#5B6178]">
                New staffing requests appear here as soon as you publish them.
              </p>
            </div>
          ) : (
            needsFunding.map((shift) => {
              const open = openShiftId === shift.id;
              return (
                <div key={shift.id} className="rounded-2xl border border-[#E9EAF2] bg-[#FBFBFE] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#0B1020]">{shift.title}</p>
                      <p className="text-sm text-[#5B6178]">
                        {formatDate(shift.shiftDate)} · {shift.requiredStaff} crew · {formatCurrency(shift.compensation)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-[#8A90A6]">Deposit needed</p>
                        <p className="text-lg font-semibold text-[#0B1020]">{formatCurrency(shift.requiredAmount)}</p>
                      </div>
                      <Button
                        variant={open ? "secondary" : "default"}
                        onClick={() => setOpenShiftId(open ? null : shift.id)}
                      >
                        {open ? "Cancel" : <><Wallet className="h-4 w-4" /> Deposit</>}
                      </Button>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-4">
                      <EscrowDepositForm
                        shiftId={shift.id}
                        shiftTitle={shift.title}
                        amount={shift.requiredAmount}
                        onFunded={() => setOpenShiftId(null)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Held in escrow</CardTitle>
          <CardDescription>Money you have deposited that has not been paid out yet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {heldShifts.length === 0 ? (
            <p className="text-sm text-[#5B6178]">No funds are currently held. Deposit on a shift above to reserve its crew cost.</p>
          ) : (
            heldShifts.map((shift) => (
              <div key={shift.id} className="flex flex-col gap-3 rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#0B1020]">{shift.title}</p>
                    <Badge variant={escrowStatusTone(shift.fundingStatus)}>{escrowStatusLabel(shift.fundingStatus)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[#5B6178]">
                    {formatCurrency(shift.escrowAmount)} held · event {formatDate(shift.shiftDate)}
                    {shift.fundedAt ? ` · deposited ${formatDate(shift.fundedAt)}` : ""}
                  </p>
                </div>
                <Link href={`/organizer/shifts/${shift.id}/review`}>
                  <Button variant="outline" size="sm">
                    {formatCurrency(shift.compensation)} per crew <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))
          )}

          {releasedShifts.length > 0 ? (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8A90A6]">Released</p>
              <ul className="mt-2 space-y-1 text-sm text-[#5B6178]">
                {releasedShifts.map((shift) => (
                  <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{shift.title}</span>
                    <span className="text-[#8A90A6]">
                      {formatCurrency(shift.escrowAmount)} paid{shift.releasedAt ? ` · ${formatDate(shift.releasedAt)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deposit history</CardTitle>
          <CardDescription>Every escrow deposit taken on your account, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <p className="text-sm text-[#5B6178]">No deposits yet. Your first funded shift will show up here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E9EAF2] text-xs uppercase tracking-[0.18em] text-[#8A90A6]">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Shift</th>
                    <th className="py-2 pr-4 font-medium">Reference</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-b border-[#F2F2F7] last:border-0">
                      <td className="py-3 pr-4 text-[#5B6178]">{formatDate(deposit.createdAt)}</td>
                      <td className="py-3 pr-4 font-medium text-[#0B1020]">{deposit.shiftTitle ?? "Shift removed"}</td>
                      <td className="py-3 pr-4 text-[#8A90A6]">{deposit.reference ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={deposit.status === "COMPLETED" ? "default" : "secondary"}>
                          {transactionStatusLabel(deposit.status)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold text-[#0B1020]">{formatCurrency(deposit.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
