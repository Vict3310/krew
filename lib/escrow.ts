/**
 * Escrow — the money side of a staffing request.
 *
 * This is a simulation, not a live payment rail: nothing here talks to a bank or
 * a card network. What is real is the state machine and the arithmetic, so the
 * organizer deposit / crew release flow behaves exactly as it would once a
 * provider is plugged into `simulateCardCharge`.
 *
 * The module is deliberately free of database and framework imports so the
 * money rules can be unit tested on their own.
 */

export type EscrowFundingStatus = "UNFUNDED" | "FUNDED" | "RELEASED" | "REFUNDED";

const FUNDING_LABELS: Record<string, string> = {
  UNFUNDED: "Not funded",
  FUNDED: "Held in escrow",
  RELEASED: "Released to crew",
  REFUNDED: "Refunded",
};

export function escrowStatusLabel(status: string): string {
  return FUNDING_LABELS[status] ?? status;
}

/** Tone for the status badge: funded money is the "live" state. */
export function escrowStatusTone(status: string): "default" | "secondary" | "outline" {
  if (status === "FUNDED") return "default";
  if (status === "RELEASED" || status === "REFUNDED") return "outline";
  return "secondary";
}

/**
 * The amount an organizer must hold before crew can be paid: every opening's
 * headcount at the shift's per-person rate. Negative inputs are clamped so a bad
 * row can never produce a negative deposit.
 */
export function escrowRequiredAmount(compensation: number, headcount: number): number {
  const rate = Math.max(0, Math.trunc(compensation) || 0);
  const crew = Math.max(0, Math.trunc(headcount) || 0);
  return rate * crew;
}

export type EscrowReleaseGate = {
  allowed: boolean;
  /** Why release is blocked, ready to show the organizer. */
  reason?: string;
};

/**
 * Funds may only be released once the event has actually happened. An organizer
 * who finishes the shift early can mark it completed, which also unlocks the
 * release, but a future date on an open shift never does.
 */
export function canReleaseEscrow(input: {
  fundingStatus: string;
  shiftStatus: string;
  shiftDate: Date;
  now?: Date;
}): EscrowReleaseGate {
  if (input.fundingStatus === "RELEASED") {
    return { allowed: false, reason: "These funds have already been released." };
  }
  if (input.fundingStatus !== "FUNDED") {
    return { allowed: false, reason: "Fund this shift before releasing money to the crew." };
  }

  const now = input.now ?? new Date();
  const eventDayReached = input.shiftDate.getTime() <= now.getTime();

  if (!eventDayReached && input.shiftStatus !== "COMPLETED") {
    return {
      allowed: false,
      reason: `Funds unlock once the event has happened. Mark the shift completed when the crew is done, or release on or after ${input.shiftDate.toISOString().slice(0, 10)}.`,
    };
  }

  return { allowed: true };
}

/* ------------------------------------------------------------------ *
 * Simulated card charge
 * ------------------------------------------------------------------ */

export type SimulatedChargeInput = {
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export type SimulatedChargeResult =
  | { ok: true; reference: string; last4: string; brand: string }
  | { ok: false; error: string };

/** Digits only, whatever the user typed with spaces or dashes. */
export function normalizeCardNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** The Luhn checksum every real card number satisfies. */
export function passesLuhn(cardNumber: string): boolean {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
}

function cardBrand(cardNumber: string): string {
  const digits = normalizeCardNumber(cardNumber);
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}

/**
 * Parse `MM/YY` into the first day of that month. Returns null when malformed so
 * the caller can reject it with one clear message.
 */
function parseExpiry(expiry: string): Date | null {
  const match = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2,4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return new Date(Date.UTC(year, month - 1, 1));
}

export function generateEscrowReference(prefix = "ESC"): string {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${stamp}${random}`;
}

/**
 * Charge the organizer's card for the escrow deposit.
 *
 * Everything is validated here and the card is never stored or logged — the
 * simulated gateway returns a reference and the last four digits, which is all
 * the rest of the app is allowed to see. Swap the body of this function for a
 * real provider call and the calling code does not change.
 */
export function simulateCardCharge(input: SimulatedChargeInput): SimulatedChargeResult {
  const name = (input.cardName ?? "").trim();
  if (name.length < 2) {
    return { ok: false, error: "Enter the name on the card." };
  }

  const digits = normalizeCardNumber(input.cardNumber ?? "");
  if (digits.length < 13 || digits.length > 19) {
    return { ok: false, error: "Enter a valid card number." };
  }
  if (!passesLuhn(digits)) {
    return { ok: false, error: "That card number failed its check — please re-enter it." };
  }

  const expiry = parseExpiry(input.expiry ?? "");
  if (!expiry) {
    return { ok: false, error: "Enter the expiry as MM/YY." };
  }

  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (expiry.getTime() < thisMonth.getTime()) {
    return { ok: false, error: "That card has expired." };
  }

  const cvc = (input.cvc ?? "").trim();
  if (!/^\d{3,4}$/.test(cvc)) {
    return { ok: false, error: "Enter the 3 or 4 digit security code." };
  }

  return {
    ok: true,
    reference: generateEscrowReference(),
    last4: digits.slice(-4),
    brand: cardBrand(digits),
  };
}
