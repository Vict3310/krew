"use server";

import { revalidatePath } from "next/cache";
import { ApplicationStatus, AssignmentStatus, Role, ShiftStatus } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getActiveAssignmentCountsByOpening } from "@/lib/data";
import { prisma } from "@/lib/db";
import { toCoordinates } from "@/lib/geo/coordinates";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");

/** One worker type on a staffing request: what they do and how many are needed. */
const openingSchema = z.object({
  role: z.string().trim().min(2, "Name each worker type, for example Security.").max(60),
  headcount: z.coerce.number().int().min(1, "Each worker type needs at least 1 person.").max(500),
});

const shiftInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Shift title must be at least 3 characters.").max(120),
  // The shift's category and headcount are derived from its openings: the first
  // role becomes the marketplace category and the headcount is the sum, so the
  // two can never drift apart.
  openings: z
    .array(openingSchema)
    .min(1, "Add at least one worker type.")
    .max(12, "Keep it to 12 worker types or fewer."),
  description: z.string().trim().min(20, "Describe the role with at least 20 characters.").max(2000),
  venue: z.string().trim().min(3, "Venue is required.").max(160),
  location: z.string().trim().min(2, "Location is required.").max(80),
  date: dateString,
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use a HH:MM end time."),
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

/**
 * Collapse the submitted rows into the roles actually stored on the shift.
 * Two rows for the same worker type are merged rather than shown twice, and the
 * order the organizer typed is preserved for the first appearance of each role.
 */
function normalizeOpenings(openings: { role: string; headcount: number }[]) {
  const merged = new Map<string, { role: string; headcount: number }>();

  for (const opening of openings) {
    const key = opening.role.trim().toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.headcount += opening.headcount;
    } else {
      merged.set(key, { role: opening.role.trim(), headcount: opening.headcount });
    }
  }

  return [...merged.values()];
}

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

  const openings = normalizeOpenings(data.openings);
  const requiredStaff = openings.reduce((sum, opening) => sum + opening.headcount, 0);

  if (requiredStaff > 500) {
    return { ok: false, error: "A shift can request at most 500 crew in total." };
  }

  /*
   * A single coordinate is meaningless, so a position is only stored when both
   * values are valid. A pin with no declared precision is stored as
   * APPROXIMATE, which is the conservative label: the interface then tells the
   * worker to confirm the entrance on the ground instead of implying certainty.
   */
  const position = toCoordinates(data.latitude ?? null, data.longitude ?? null);

  if (position && !data.locationPrecision) {
    return { ok: false, error: "Please confirm the venue pin before publishing this shift." };
  }

  const payload = {
    title: data.title,
    category: openings[0]!.role,
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
    requiredStaff,
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

      /*
       * Openings are replaced wholesale rather than diffed: the form submits the
       * full role list every time, and an edit that removes a role should remove
       * the matching row too. Assignments and applications that referenced a
       * removed opening fall back to "any role" (openingId set null) instead of
       * being deleted, so no confirmed crew member loses their shift.
       */
      await prisma.$transaction([
        prisma.shift.update({ where: { id: existing.id }, data: payload }),
        prisma.shiftOpening.deleteMany({ where: { shiftId: existing.id } }),
        prisma.shiftOpening.createMany({
          data: openings.map((opening) => ({ shiftId: existing.id, role: opening.role, headcount: opening.headcount })),
        }),
      ]);
      revalidatePath("/organizer/shifts");
      revalidatePath(`/organizer/shifts/${existing.id}/review`);
      revalidatePath("/shifts");
      return { ok: true, shiftId: existing.id };
    }

    const shift = await prisma.shift.create({
      data: {
        ...payload,
        organizerId: user.id,
        openings: { create: openings.map((opening) => ({ role: opening.role, headcount: opening.headcount })) },
      },
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
    include: {
      shift: {
        select: {
          id: true,
          organizerId: true,
          requiredStaff: true,
          title: true,
          openings: { orderBy: { createdAt: "asc" }, select: { id: true, role: true, headcount: true } },
        },
      },
    },
  });

  if (!application) return { ok: false, error: "That application no longer exists." };

  if (user.role !== Role.ADMIN && application.shift.organizerId !== user.id) {
    return { ok: false, error: "You can only review applications for your own shifts." };
  }

  const shiftId = application.shift.id;

  try {
    if (decision === "ACCEPTED") {
      // Capacity is enforced here, not in the UI: a shift can never be over-filled,
      // and neither can an individual worker type.
      const filledByOpening = await getActiveAssignmentCountsByOpening(shiftId);
      const filled = Object.values(filledByOpening).reduce((sum, count) => sum + count, 0);

      if (filled >= application.shift.requiredStaff) {
        return { ok: false, error: `All ${application.shift.requiredStaff} positions for "${application.shift.title}" are already filled.` };
      }

      const { openings } = application.shift;

      // Confirm onto the role the worker asked for, otherwise the first role that
      // still has room. With no openings on the shift this stays null and only the
      // overall headcount applies.
      const openingId = openings.some((opening) => opening.id === application.openingId)
        ? application.openingId
        : (openings.find((opening) => (filledByOpening[opening.id] ?? 0) < opening.headcount)?.id ?? null);

      if (openingId) {
        const opening = openings.find((candidate) => candidate.id === openingId)!;
        if ((filledByOpening[opening.id] ?? 0) >= opening.headcount) {
          return { ok: false, error: `All ${opening.headcount} ${opening.role} positions are already filled.` };
        }
      }

      await prisma.$transaction([
        prisma.shiftApplication.update({
          where: { id: applicationId },
          data: { status: ApplicationStatus.ACCEPTED },
        }),
        prisma.shiftAssignment.upsert({
          where: { shiftId_userId: { shiftId, userId: application.userId } },
          update: { status: AssignmentStatus.ASSIGNED, assignedById: user.id, openingId },
          create: {
            shiftId,
            userId: application.userId,
            assignedById: user.id,
            openingId,
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
