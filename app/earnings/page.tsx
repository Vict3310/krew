import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { transactionTypeLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const user = await requireUser();
  const transactions = await prisma.transactionRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const total = transactions.reduce<number>((sum, item) => sum + item.amount, 0);

  return (
    <>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-8">
        <div className="rounded-[28px] border border-[#E6E7EF] bg-white p-6 shadow-[0_16px_38px_rgba(11,16,32,0.06)]">
          <p className="text-xs uppercase tracking-[0.25em] text-[#5B6178]">Earnings</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#0B1020]">Simulated earnings overview</h1>
          <p className="mt-2 text-xl font-medium text-[#5B3DF5]">{formatCurrency(total)}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction history</CardTitle>
            <CardDescription>All simulated payout and funding records remain auditable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-sm text-[#5B6178]">
                No payout records yet. When an organizer marks work as completed and records the payout, it appears
                here with its status.
              </p>
            ) : null}

            {transactions.map((transaction: (typeof transactions)[number]) => (
              <div key={transaction.id} className="flex flex-col gap-2 rounded-2xl border border-[#E9EAF2] bg-[#FAFAFD] p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-[#0B1020]">{transactionTypeLabel(transaction.type)}</p>
                  <p className="text-sm text-[#5B6178]">{transaction.reference ?? "No reference"}</p>
                </div>
                <div className="text-right text-sm text-[#5B6178]">
                  <p>{formatDate(transaction.createdAt)}</p>
                  <p className="font-semibold text-[#0B1020]">{formatCurrency(transaction.amount)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
