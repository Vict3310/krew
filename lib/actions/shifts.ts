"use server";

import { revalidatePath } from "next/cache";
import { ApplicationStatus, AssignmentStatus, Role, ShiftStatus } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { countActiveAssignments } from "@/lib/data";
import { prisma } from "@/lib/db";
import { toCoordinates } from "@/lib/geo/coordinates";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");

const shiftInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Shift title must be at least 3 characters.").max(120),
  category: z.string().trim().min(2, "Choose a category for this role.").max(60),
  description: z.string().trim().min(20, "Describe the role with at least 20 characters.").max(2000),
  venue: z.string().trim().min(3, "Venue is required.").max(160),
  location: z.string().trim().min(2, "Location is required.").max(80),
  date: dateString,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM end time."),
  requiredStaff: z.coerce.number().int().min(1, "At least 1 crew member is required.").max(500),
  compensation: z.coerce.number().int().min(1000, "Pay must be at least ₦1,000.").max(100_000_000),
  deadline: dateString,
  publish: z.boolean().optional().default(true),
  // Venue navigation. Coordinates are optional: a shift with no confirmed pin is
  // a legitimate state, and is stored as one rather than guessed at.
  venueAddress: z.string().trim().max(300).optional().default(""),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationPrecision: z.enum(["EXACT", "APPROXIMATE", ""]).optional().default(""),
  arrivalInstructions: z.string().trim().max(1000).optional().default(""),
  arrivalContact: z.string().trim().max(160).optional().default(""),
  arrivalTime: z.string().trim().max(80).optional().default(""),
});

export type ShiftActionState = { ok: boolean; error?: string; shiftId?: string };

export async function createOrUpdateShift(raw: unknown): Promise<ShiftActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Please sign in to publish a shift." };
  }
  if (user.role !== Role.ORGANIZER && user.role !== Role.ADMIN) {
    return { ok: false, error: "Only organizer accounts can publish staffing requests." };
  }

  const parsed = shiftInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review the shift details." };
  }

  const data = parsed.data;
  const shiftDate = new Date(`${data.date}T00:00:00.000Z`);
  const applicationDeadline = new Date(`${data.deadline}T23:59:59.000Z`);

  if (applicationDeadline.getTime() > shiftDate.getTime()) {
    return { ok: false, error: "The application deadline must be on or before the shift date." };
  }

  /*
   * A single coordinate is meaningless, so a position is only stored when both
   * values are valid. A pin with no declared precision is stored as
   * APPROXIMATE, which is the conservative label: the interface then tells the
   * worker to confirm the entrance on the ground instead of implying certainty.
   */
  const position = toCoordinates(data.latitude ?? null, data.longitude ?? null);

  const payload = {
    title: data.title,
    category: data.category,
    description: data.description,
    venue: data.venue,
    location: data.location,
    venueAddress: data.venueAddress || null,
    latitude: position?.latitude ?? null,
    longitude: position?.longitude ?? null,
    locationPrecision: position ? data.locationPrecision || "APPROXIMATE" : null,
    arrivalInstructions: data.arrivalInstructions || null,
    arrivalContact: data.arrivalContact || null,
    arrivalTime: data.arrivalTime || null,
    shiftDate,
    startTime: data.startTime,
    endTime: data.endTime,
    compensation: data.compensation,
    requiredStaff: data.requiredStaff,
    applicationDeadline,
    status: data.publish ? ShiftStatus.PUBLISHED : ShiftStatus.DRAFT,
  };

  try {
    if (data.id) {
      // Ownership is re-checked on the server: an organizer may only edit their own shift.
      const existing = await prisma.shift.findFirst({
        where: { id: data.id, ...(user.role === Role.ADMIN ? {} : { organizerId: user.id }) },
        select: { id: true },
      });

      if (!existing) {
        return { ok: false, error: "That shift does not exist on your account." };
      }

      await prisma.shift.update({ where: { id: existing.id }, data: payload });
      revalidatePath("/organizer/shifts");
      revalidatePath(`/organizer/shifts/${existing.id}/review`);
      revalidatePath("/shifts");
      return { ok: true, shiftId: existing.id };
    }

    const shift = await prisma.shift.create({
      data: { ...payload, organizerId: user.id },
    });

    revalidatePath("/organizer");
    revalidatePath("/organizer/shifts");
    revalidatePath("/shifts");
    return { ok: true, shiftId: shift.id };
  } catch (error) {
    console.error("Failed to save shift:", error);
    return { ok: false, error: "We could not save this shift right now. Please try again." };
  }
}

export async function deleteShift(shiftId: string): Promise<ShiftActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, ...(user.role === Role.ADMIN ? {} : { organizerId: user.id }) },
    select: { id: true },
  });

  if (!shift) return { ok: false, error: "That shift does not exist on your account." };

  await prisma.shift.delete({ where: { id: shift.id } });
  revalidatePath("/organizer");
  revalidatePath("/organizer/shifts");
  revalidatePath("/shifts");
  return { ok: true };
}

export async function decideApplication({
  applicationId,
  decision,
}: {
  applicationId: string;
  decision: "ACCEPTED" | "REJECTED";
}): Promise<ShiftActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const application = await prisma.shiftApplication.findUnique({
    where: { id: applicationId },
    include: { shift: { select: { id: true, organizerId: true, requiredStaff: true, title: true } } },
  });

  if (!application) return { ok: false, error: "That application no longer exists." };

  if (user.role !== Role.ADMIN && application.shift.organizerId !== user.id) {
    return { ok: false, error: "You can only review applications for your own shifts." };
  }

  const shiftId = application.shift.id;

  try {
    if (decision === "ACCEPTED") {
      // Capacity is enforced here, not in the UI: a shift can never be over-filled.
      const filled = await countActiveAssignments(shiftId);
      if (filled >= application.shift.requiredStaff) {
        return { ok: false, error: `All ${application.shift.requiredStaff} positions for "${application.shift.title}" are already filled.` };
      }

      await prisma.$transaction([
        prisma.shiftApplication.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.ACCEPTED },
        }),
        prisma.shiftAssignment.upsert({
          where: { shiftId_userId: { shiftId, userId: application.userId } },
          update: { status: AssignmentStatus.ASSIGNED, assignedById: user.id },
          create: {
            shiftId,
            userId: application.userId,
            assignedById: user.id,
            status: AssignmentStatus.ASSIGNED,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.shiftApplication.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.REJECTED },
        }),
        prisma.shiftAssignment.updateMany({
          where: { shiftId, userId: application.userId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED] } },
          data: { status: AssignmentStatus.CANCELLED },
        }),
      ]);
    }

    revalidatePath(`/organizer/shifts/${shiftId}/review`);
    revalidatePath(`/organizer/applicants/${application.userId}`);
    revalidatePath("/organizer");
    revalidatePath("/organizer/shifts");
    revalidatePath("/dashboard");
    revalidatePath("/applications");
    revalidatePath("/my-shifts");

    return { ok: true };
  } catch (error) {
    console.error("Failed to record decision:", error);
    return { ok: false, error: "We could not record that decision. Please try again." };
  }
}
