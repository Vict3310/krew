"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Info, Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { fundShiftEscrow } from "@/lib/actions/escrow";
import { formatCurrency } from "@/lib/utils";

/**
 * The simulated card form used to deposit a shift's crew cost into escrow.
 *
 * It is shared by the billing page and the escrow panel on a shift's review
 * page, so there is one payment form to maintain and it behaves identically in
 * both places. The card is validated and "charged" server-side and is never
 * stored — only a reference and the last four digits survive the request.
 */
export default function EscrowDepositForm({
  shiftId,
  shiftTitle,
  amount,
  onFunded,
}: {
  shiftId: string;
  shiftTitle: string;
  amount: number;
  /** Called after a successful deposit, so a caller can close its own UI. */
  onFunded?: () => void;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState({ cardName: "", cardNumber: "", expiry: "", cvc: "" });

  function update(field: keyof typeof card, value: string) {
    setCard((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await fundShiftEscrow({ shiftId, ...card });

      if (!result.ok) {
        setError(result.error ?? "We could not take that deposit.");
        push({ title: "Deposit failed", description: result.error, variant: "error" });
        return;
      }

      setCard({ cardName: "", cardNumber: "", expiry: "", cvc: "" });
      push({
        title: "Funds held in escrow",
        description: `${formatCurrency(result.amount ?? amount)} is reserved for “${shiftTitle}” (ref ${result.reference}).`,
        variant: "success",
      });
      onFunded?.();
      router.refresh();
    });
  }

  return (
    <form className="space-y-4 rounded-2xl border border-[#E6E7EF] bg-white p-4" onSubmit={submit}>
      <div className="flex items-start gap-2 rounded-xl bg-[#F5F4FF] p-3 text-xs text-[#5B6178]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5B3DF5]" aria-hidden="true" />
        <span>
          Simulated payment — no real card is charged. Use a test card such as
          <span className="font-medium text-[#0B1020]"> 4242 4242 4242 4242</span>, any future expiry and any 3-digit code.
        </span>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`cardName-${shiftId}`}>Name on card</Label>
          <Input
            id={`cardName-${shiftId}`}
            value={card.cardName}
            onChange={(event) => update("cardName", event.target.value)}
            placeholder="Chidi Organizer"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`cardNumber-${shiftId}`}>Card number</Label>
          <Input
            id={`cardNumber-${shiftId}`}
            value={card.cardNumber}
            onChange={(event) => update("cardNumber", event.target.value)}
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`expiry-${shiftId}`}>Expiry (MM/YY)</Label>
          <Input
            id={`expiry-${shiftId}`}
            value={card.expiry}
            onChange={(event) => update("expiry", event.target.value)}
            placeholder="12/30"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`cvc-${shiftId}`}>Security code</Label>
          <Input
            id={`cvc-${shiftId}`}
            value={card.cvc}
            onChange={(event) => update("cvc", event.target.value)}
            placeholder="123"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending || amount <= 0}>
        {pending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
        ) : (
          <><Lock className="h-4 w-4" /> Deposit {formatCurrency(amount)} into escrow</>
        )}
      </Button>
    </form>
  );
}
