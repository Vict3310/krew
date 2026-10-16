import { describe, expect, it } from "vitest";

import {
  canReleaseEscrow,
  escrowRequiredAmount,
  escrowStatusLabel,
  generateEscrowReference,
  normalizeCardNumber,
  passesLuhn,
  simulateCardCharge,
} from "@/lib/escrow";

/** A card number that satisfies Luhn, used the way a test card would be. */
const VALID_CARD = "4242 4242 4242 4242";

function futureExpiry(): string {
  const now = new Date();
  const year = (now.getUTCFullYear() + 2) % 100;
  return `12/${String(year).padStart(2, "0")}`;
}

describe("escrow amount", () => {
  it("is the per-person rate times the total headcount across roles", () => {
    expect(escrowRequiredAmount(40_000, 8)).toBe(320_000);
    expect(escrowRequiredAmount(40_000, 0)).toBe(0);
  });

  it("never returns a negative amount for bad input", () => {
    expect(escrowRequiredAmount(-500, 4)).toBe(0);
    expect(escrowRequiredAmount(500, -4)).toBe(0);
  });
});

describe("release gate", () => {
  const past = new Date("2026-01-01T00:00:00.000Z");
  const future = new Date("2030-01-01T00:00:00.000Z");
  const now = new Date("2026-06-01T00:00:00.000Z");

  it("refuses to release funds that were never deposited", () => {
    const gate = canReleaseEscrow({ fundingStatus: "UNFUNDED", shiftStatus: "PUBLISHED", shiftDate: past, now });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/fund this shift/i);
  });

  it("allows release once the event day has passed", () => {
    expect(canReleaseEscrow({ fundingStatus: "FUNDED", shiftStatus: "PUBLISHED", shiftDate: past, now }).allowed).toBe(true);
  });

  it("blocks release before the event unless the organizer completed it", () => {
    const blocked = canReleaseEscrow({ fundingStatus: "FUNDED", shiftStatus: "PUBLISHED", shiftDate: future, now });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/unlock/i);

    expect(canReleaseEscrow({ fundingStatus: "FUNDED", shiftStatus: "COMPLETED", shiftDate: future, now }).allowed).toBe(true);
  });

  it("does not release twice", () => {
    const gate = canReleaseEscrow({ fundingStatus: "RELEASED", shiftStatus: "COMPLETED", shiftDate: past, now });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toMatch(/already been released/i);
  });
});

describe("simulated card charge", () => {
  it("accepts a well-formed card and returns only a reference and last four digits", () => {
    const result = simulateCardCharge({
      cardName: "Ada Worker",
      cardNumber: VALID_CARD,
      expiry: futureExpiry(),
      cvc: "123",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.last4).toBe("4242");
      expect(result.brand).toBe("Visa");
      expect(result.reference).toMatch(/^ESC-/);
      expect(result.reference).not.toContain("4242");
    }
  });

  it("rejects a card that fails the Luhn checksum", () => {
    const result = simulateCardCharge({ cardName: "Ada", cardNumber: "4242424242424241", expiry: futureExpiry(), cvc: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/check/i);
  });

  it("rejects an expired card", () => {
    const result = simulateCardCharge({ cardName: "Ada", cardNumber: VALID_CARD, expiry: "01/20", cvc: "123" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expired/i);
  });

  it("rejects a missing name, bad expiry and bad security code", () => {
    expect(simulateCardCharge({ cardName: "", cardNumber: VALID_CARD, expiry: futureExpiry(), cvc: "123" }).ok).toBe(false);
    expect(simulateCardCharge({ cardName: "Ada", cardNumber: VALID_CARD, expiry: "13/30", cvc: "123" }).ok).toBe(false);
    expect(simulateCardCharge({ cardName: "Ada", cardNumber: VALID_CARD, expiry: futureExpiry(), cvc: "12" }).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("normalizes a typed card number to digits", () => {
    expect(normalizeCardNumber("4242 4242-4242 4242")).toBe("4242424242424242");
  });

  it("validates Luhn on known numbers", () => {
    expect(passesLuhn("4242424242424242")).toBe(true);
    expect(passesLuhn("1234567812345678")).toBe(false);
    expect(passesLuhn("4242")).toBe(false);
  });

  it("generates unique references", () => {
    const references = new Set(Array.from({ length: 50 }, () => generateEscrowReference()));
    expect(references.size).toBe(50);
  });

  it("labels every funding status in plain language", () => {
    expect(escrowStatusLabel("UNFUNDED")).toBe("Not funded");
    expect(escrowStatusLabel("FUNDED")).toBe("Held in escrow");
    expect(escrowStatusLabel("RELEASED")).toBe("Released to crew");
  });
});
