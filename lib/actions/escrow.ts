"use server";

import { revalidatePath } from "next/cache";
import { AssignmentStatus, FundingStatus, Role, ShiftStatus, TransactionStatus } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReleaseEscrow, escrowRequiredAmount, simulateCardCharge } from "@/lib/escrow";

/**
 * Escrow actions.
 *
 * Money moves in two steps and neither can be skipped:
 *  1. `fundShiftEscrow` — the organizer deposits the whole crew cost. The card is
 *     validated and charged by the simulated gateway in `lib/escrow`, and only a
 *     reference plus the last four digits are ever written down.
 *  2. `releaseShiftEscrow` — once the event has happened, the held amount is paid
 *     out to the confirmed crew as completed payout records.
 *
 * Release is refused until the shift is actually funded, so the state machine
 * cannot be talked into paying out money that was never collected.
 */

export type EscrowActionState = {
  ok: boolean;
  error?: string;
  reference?: string;
  amount?: number;
  last4?: string;
  paidCount?: number;
};

const fundSchema = z.object({
  shiftId: z.string().uuid("That shift could not be found."),
  cardName: z.string().trim().min(2, "Enter the name on the card.").max(80),
  cardNumber: z.string().trim().min(12, "Enter a valid card number.").max(25),
  expiry: z.string().trim().min(4, "Enter the expiry as MM/YY.").max(7),
  cvc: z.string().trim().min(3, "Enter the security code.").max(4),
});

/** Loads a shift the signed-in user is allowed to act on (admins act on any). */
async function findOwnedShift(shiftId: string, userId: string, isAdmin: boolean) {
  return prisma.shift.findFirst({
    where: { id: shiftId, ...(isAdmin ? {} : { organizerId: userId }) },
    select: {
      id: true,
      title: true,
      organizerId: true,
      compensation: true,
      requiredStaff: true,
      fundingStatus: true,
      escrowAmount: true,
      status: true,
      shiftDate: true,
    },
  });
}

function revalidateEscrow(shiftId: string) {
  revalidatePath(`/organizer/shifts/${shiftId}/review`);
  revalidatePath("/organizer/shifts");
  revalidatePath("/organizer");
  revalidatePath("/earnings");
  revalidatePath("/my-shifts");
}

/** Deposit the crew cost for one shift into escrow. */
export async function fundShiftEscrow(raw: unknown): Promise<EscrowActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only organizer accounts can fund a shift." };
  }

  const parsed = fundSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review the payment details." };
  }

  const { shiftId, cardName, cardNumber, expiry, cvc } = parsed.data;

  try {
    const shift = await findOwnedShift(shiftId, user.id, user.role === Role.ADMIN);
    if (!shift) return { ok: false, error: "That shift does not exist on your account." };

    if (shift.fundingStatus === FundingStatus.FUNDED) {
      return { ok: false, error: "This shift is already funded." };
    }
    if (shift.fundingStatus === FundingStatus.RELEASED) {
      return { ok: false, error: "These funds have already been released to the crew." };
    }

    const amount = escrowRequiredAmount(shift.compensation, shift.requiredStaff);
    if (amount <= 0) {
      return { ok: false, error: "Set the crew headcount and pay before funding this shift." };
    }

    // The simulated gateway. Swap this call for a real provider and the rest of
    // the flow is unchanged.
    const charge = simulateCardCharge({ cardName, cardNumber, expiry, cvc });
    if (!charge.ok) {
      return { ok: false, error: charge.error };
    }

    await prisma.$transaction([
      prisma.transactionRecord.create({
        data: {
          userId: user.id,
          shiftId,
          type: "ESCROW_DEPOSIT",
          amount,
          status: TransactionStatus.COMPLETED,
          reference: charge.reference,
          notes: `Escrow deposit for “${shift.title}” · ${charge.brand} ending ${charge.last4}`,
        },
      }),
      prisma.shift.update({
        where: { id: shiftId },
        data: {
          fundingStatus: FundingStatus.FUNDED,
          escrowAmount: amount,
          fundedAt: new Date(),
        },
      }),
    ]);

    revalidateEscrow(shiftId);
    return { ok: true, reference: charge.reference, amount, last4: charge.last4 };
  } catch (error) {
    console.error("Failed to fund shift escrow:", error);
    return { ok: false, error: "We could not take that deposit right now. Please try again." };
  }
}

/**
 * Pay the held funds out to the confirmed crew.
 *
 * Each confirmed crew member gets one completed payout record for the per-person
 * rate, their assignment is closed out, and the shift moves to completed. The
 * payout is only ever created once per worker, so a double click cannot pay twice.
 */
export async function releaseShiftEscrow(shiftId: string): Promise<EscrowActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only organizer accounts can release funds." };
  }

  try {
    const shift = await findOwnedShift(shiftId, user.id, user.role === Role.ADMIN);
    if (!shift) return { ok: false, error: "That shift does not exist on your account." };

    const gate = canReleaseEscrow({
      fundingStatus: shift.fundingStatus,
      shiftStatus: shift.status,
      shiftDate: shift.shiftDate,
    });
    if (!gate.allowed) {
      return { ok: false, error: gate.reason ?? "These funds cannot be released yet." };
    }

    const crew = await prisma.shiftAssignment.findMany({
      where: {
        shiftId,
        status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED] },
      },
      select: { id: true, userId: true, status: true },
    });

    const alreadyPaid = await prisma.transactionRecord.findMany({
      where: { shiftId, type: "PAYOUT", userId: { in: crew.map((member) => member.userId) } },
      select: { userId: true },
    });
    const paidUserIds = new Set(alreadyPaid.map((record) => record.userId));

    const unpaid = crew.filter((member) => !paidUserIds.has(member.userId));
    const now = new Date();
    const reference = `PAY-${shiftId.slice(0, 8).toUpperCase()}`;

    await prisma.$transaction([
      ...(unpaid.length > 0
        ? [
            prisma.transactionRecord.createMany({
              data: unpaid.map((member) => ({
                userId: member.userId,
                shiftId,
                type: "PAYOUT",
                amount: shift.compensation,
                status: TransactionStatus.COMPLETED,
                reference: `${reference}-${member.id.slice(0, 4).toUpperCase()}`,
                notes: `Escrow payout for “${shift.title}”`,
              })),
            }),
          ]
        : []),
      prisma.shiftAssignment.updateMany({
        where: { shiftId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED] } },
        data: { status: AssignmentStatus.COMPLETED, completedAt: now },
      }),
      prisma.shift.update({
        where: { id: shiftId },
        data: { fundingStatus: FundingStatus.RELEASED, releasedAt: now, status: ShiftStatus.COMPLETED },
      }),
    ]);

    revalidateEscrow(shiftId);
    return { ok: true, paidCount: unpaid.length, amount: unpaid.length * shift.compensation };
  } catch (error) {
    console.error("Failed to release shift escrow:", error);
    return { ok: false, error: "We could not release these funds right now. Please try again." };
  }
}

/** Mark the event finished, which unlocks the release on an early finish. */
export async function markShiftCompleted(shiftId: string): Promise<EscrowActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only organizer accounts can complete a shift." };
  }

  try {
    const shift = await findOwnedShift(shiftId, user.id, user.role === Role.ADMIN);
    if (!shift) return { ok: false, error: "That shift does not exist on your account." };

    if (shift.status === ShiftStatus.COMPLETED) {
      return { ok: true };
    }

    await prisma.shift.update({ where: { id: shiftId }, data: { status: ShiftStatus.COMPLETED } });
    revalidateEscrow(shiftId);
    return { ok: true };
  } catch (error) {
    console.error("Failed to complete shift:", error);
    return { ok: false, error: "We could not update this shift right now. Please try again." };
  }
}
