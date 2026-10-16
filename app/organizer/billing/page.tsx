import Link from "next/link";

import BillingView from "@/components/organizer/billing-view";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getOrganizerBilling } from "@/lib/data";
import { escrowRequiredAmount } from "@/lib/escrow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billing | Krew",
};

/**
 * Organizer billing.
 *
 * The place money is deposited and accounted for: what is held, what is still
 * owed, and every deposit that has been taken. Depositing here runs the same
 * simulated gateway as the escrow panel on a shift's review page.
 */
export default async function OrganizerBillingPage() {
  const user = await requireRole(["ORGANIZER", "ADMIN"]);
  const { shifts, deposits } = await getOrganizerBilling(user.id);

  const rows = shifts.map((shift) => ({
    id: shift.id,
    title: shift.title,
    status: shift.status,
    fundingStatus: shift.fundingStatus,
    escrowAmount: shift.escrowAmount,
    requiredAmount: escrowRequiredAmount(shift.compensation, shift.requiredStaff),
    requiredStaff: shift.requiredStaff,
    compensation: shift.compensation,
    shiftDate: shift.shiftDate.toISOString(),
    fundedAt: shift.fundedAt?.toISOString() ?? null,
    releasedAt: shift.releasedAt?.toISOString() ?? null,
  }));

  const sum = (filtered: typeof rows, pick: (row: (typeof rows)[number]) => number) =>
    filtered.reduce((total, row) => total + pick(row), 0);

  const fundedShifts = rows.filter((row) => row.fundingStatus === "FUNDED");
  const releasedShifts = rows.filter((row) => row.fundingStatus === "RELEASED");
  const unfundedOpen = rows.filter((row) => row.fundingStatus === "UNFUNDED" && row.status === "PUBLISHED");

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Escrow &amp; payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B6178]">
            Deposit a shift&apos;s crew cost before the event and release it to your confirmed crew once the work is
            done. Payments are simulated — no real card is charged.
          </p>
        </div>
        <Link href="/organizer/shifts">
          <Button variant="secondary">View roster</Button>
        </Link>
      </div>

      <BillingView
        heldInEscrow={sum(fundedShifts, (row) => row.escrowAmount)}
        releasedTotal={sum(releasedShifts, (row) => row.escrowAmount)}
        awaitingDeposit={sum(unfundedOpen, (row) => row.requiredAmount)}
        fundedCount={fundedShifts.length}
        releasedCount={releasedShifts.length}
        shifts={rows}
        deposits={deposits.map((deposit) => ({
          id: deposit.id,
          amount: deposit.amount,
          status: deposit.status,
          reference: deposit.reference,
          createdAt: deposit.createdAt.toISOString(),
          shiftTitle: deposit.shift?.title ?? null,
        }))}
      />
    </main>
  );
}
