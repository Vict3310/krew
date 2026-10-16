"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canReviewAssignment, validateReview } from "@/lib/reviews";

/**
 * Leave a review on a worker.
 *
 * A review is only allowed where there is a real working relationship to judge:
 * the assignment must exist, it must belong to a shift this organizer owns, the
 * event must be over, and one review per assignment (enforced by a unique index
 * as well as the check here) stops a worker being rated twice for one shift.
 */
export type ReviewActionState = { ok: boolean; error?: string };

export async function createReview(raw: unknown): Promise<ReviewActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only organizer accounts can review workers." };
  }

  const input = (raw ?? {}) as { workerId?: unknown; shiftId?: unknown; rating?: unknown; comment?: unknown };
  const workerId = typeof input.workerId === "string" ? input.workerId : "";
  const shiftId = typeof input.shiftId === "string" ? input.shiftId : "";

  if (!workerId || !shiftId) {
    return { ok: false, error: "That review is missing the worker or the shift." };
  }

  const parsed = validateReview({ rating: input.rating, comment: input.comment });
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    // Ownership is part of the query, so another organizer's crew is not reviewable.
    const assignment = await prisma.shiftAssignment.findFirst({
      where: {
        userId: workerId,
        shiftId,
        ...(user.role === Role.ADMIN ? {} : { shift: { organizerId: user.id } }),
      },
      select: {
        id: true,
        status: true,
        shift: { select: { status: true, shiftDate: true } },
        review: { select: { id: true } },
      },
    });

    if (!assignment) {
      return { ok: false, error: "You can only review a worker you confirmed for one of your own shifts." };
    }

    if (assignment.review) {
      return { ok: false, error: "You have already reviewed this worker for that shift." };
    }

    const gate = canReviewAssignment({
      assignmentStatus: assignment.status,
      shiftStatus: assignment.shift.status,
      shiftDate: assignment.shift.shiftDate,
    });

    if (!gate.allowed) {
      return { ok: false, error: gate.reason ?? "You cannot review this shift yet." };
    }

    await prisma.review.create({
      data: {
        assignmentId: assignment.id,
        authorId: user.id,
        recipientId: workerId,
        rating: parsed.rating,
        comment: parsed.comment,
      },
    });

    revalidatePath(`/organizer/applicants/${workerId}`);
    revalidatePath(`/organizer/shifts/${shiftId}/review`);
    revalidatePath("/profile");

    return { ok: true };
  } catch (error) {
    console.error("Failed to save review:", error);
    return { ok: false, error: "We could not save that review right now. Please try again." };
  }
}
