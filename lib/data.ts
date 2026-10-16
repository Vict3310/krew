import { AccountStatus, ApplicationStatus, AssignmentStatus, Role, ShiftStatus, TransactionStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * The operational data layer.
 *
 * Neon PostgreSQL (through Prisma) is the single source of truth. There are no
 * mock rows and no fabricated fallbacks here: when a query fails, the caller is
 * expected to render an honest unavailable/empty state rather than invented
 * records. Demo mode (DEMO_AUTH) is handled at the auth layer, not here.
 */

const organizerSummary = {
  select: { id: true, name: true, username: true },
} as const;

/** Openings are always read oldest-first so the organizer sees roles as typed. */
const openingOrder = { orderBy: { createdAt: "asc" } } as const;

export type PublicShift = Awaited<ReturnType<typeof getPublicShifts>>[number];

/** Published, still-open staffing opportunities for the marketplace. */
export async function getPublicShifts(options?: { search?: string; location?: string; category?: string }) {
  const search = options?.search?.trim();
  const location = options?.location?.trim();
  const category = options?.category?.trim();

  return prisma.shift.findMany({
    where: {
      status: ShiftStatus.PUBLISHED,
      ...(location ? { location: { equals: location, mode: "insensitive" } } : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { venue: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      organizer: organizerSummary,
      openings: openingOrder,
      _count: { select: { applications: true, assignments: true } },
    },
    orderBy: [{ shiftDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

/** Distinct filter options for the marketplace, derived from real listings. */
export async function getMarketplaceFacets() {
  const [locations, categories] = await Promise.all([
    prisma.shift.findMany({
      where: { status: ShiftStatus.PUBLISHED },
      distinct: ["location"],
      select: { location: true },
      orderBy: { location: "asc" },
    }),
    prisma.shift.findMany({
      where: { status: ShiftStatus.PUBLISHED },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  return {
    locations: locations.map((row) => row.location),
    categories: categories.map((row) => row.category),
  };
}

export async function getShiftById(id: string) {
  return prisma.shift.findUnique({
    where: { id },
    include: {
      organizer: organizerSummary,
      openings: openingOrder,
      _count: { select: { applications: true, assignments: true } },
    },
  });
}

export async function getShiftApplication(userId: string, shiftId: string) {
  return prisma.shiftApplication.findUnique({
    where: { userId_shiftId: { userId, shiftId } },
  });
}

/** Every application a worker has submitted, newest first. */
export async function getWorkerApplications(userId: string) {
  return prisma.shiftApplication.findMany({
    where: { userId },
    include: { shift: { include: { organizer: organizerSummary } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Accepted assignments for a worker, including attendance state. */
export async function getWorkerAssignments(userId: string) {
  return prisma.shiftAssignment.findMany({
    where: { userId },
    include: { shift: { include: { organizer: organizerSummary } }, attendance: true },
    orderBy: { assignedAt: "desc" },
  });
}

/**
 * Earnings are only counted from payout records that are genuinely COMPLETED.
 * Pending or failed records are reported separately and never presented as paid.
 */
export async function getWorkerEarnings(userId: string) {
  const [completed, pending] = await Promise.all([
    prisma.transactionRecord.aggregate({
      where: { userId, type: "PAYOUT", status: TransactionStatus.COMPLETED },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transactionRecord.aggregate({
      where: { userId, type: "PAYOUT", status: TransactionStatus.PENDING },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    paid: completed._sum.amount ?? 0,
    paidCount: completed._count,
    pending: pending._sum.amount ?? 0,
    pendingCount: pending._count,
  };
}

export async function getWorkerDashboard(userId: string) {
  const [user, applications, assignments, earnings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { workerProfile: true },
    }),
    getWorkerApplications(userId),
    getWorkerAssignments(userId),
    getWorkerEarnings(userId),
  ]);

  return { user, applications, assignments, earnings };
}

/** Organizer-owned shifts with the counts needed to run a staffing desk. */
export async function getOrganizerShifts(organizerId: string) {
  return prisma.shift.findMany({
    where: { organizerId },
    include: {
      openings: openingOrder,
      _count: { select: { applications: true, assignments: true } },
    },
    orderBy: [{ shiftDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function getOrganizerShift(shiftId: string, organizerId: string) {
  return prisma.shift.findFirst({
    where: { id: shiftId, organizerId },
    include: {
      openings: openingOrder,
      _count: { select: { applications: true, assignments: true } },
    },
  });
}

export async function getOrganizerDashboard(organizerId: string) {
  const [user, shifts, pendingApplications, confirmedAssignments] = await Promise.all([
    prisma.user.findUnique({ where: { id: organizerId }, include: { organizerProfile: true } }),
    getOrganizerShifts(organizerId),
    prisma.shiftApplication.count({
      where: { status: ApplicationStatus.PENDING, shift: { organizerId } },
    }),
    prisma.shiftAssignment.count({
      where: { status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED] }, shift: { organizerId } },
    }),
  ]);

  const openPositions = shifts
    .filter((shift) => shift.status === ShiftStatus.PUBLISHED)
    .reduce((sum, shift) => sum + Math.max(0, shift.requiredStaff - shift._count.assignments), 0);

  return { user, shifts, pendingApplications, confirmedAssignments, openPositions };
}

/**
 * Billing view for one organizer: every shift's funding state plus the deposits
 * they have actually made.
 *
 * Deposits are read back from the organizer's own transaction records, so the
 * page reports money that really moved rather than a derived guess.
 */
export async function getOrganizerBilling(organizerId: string) {
  const [shifts, deposits] = await Promise.all([
    prisma.shift.findMany({
      where: { organizerId },
      select: {
        id: true,
        title: true,
        status: true,
        fundingStatus: true,
        escrowAmount: true,
        requiredStaff: true,
        compensation: true,
        shiftDate: true,
        fundedAt: true,
        releasedAt: true,
      },
      orderBy: [{ shiftDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.transactionRecord.findMany({
      where: { userId: organizerId, type: "ESCROW_DEPOSIT" },
      include: { shift: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { shifts, deposits };
}

/** Applications for one shift, with the worker profile used to judge fit. */
export async function getShiftApplicationsForOrganizer(shiftId: string, organizerId: string) {
  return prisma.shiftApplication.findMany({
    where: { shiftId, shift: { organizerId } },
    include: {
      user: { include: { workerProfile: true } },
      opening: true,
      shift: { select: { id: true, requiredStaff: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function countActiveAssignments(shiftId: string) {
  return prisma.shiftAssignment.count({
    where: { shiftId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED] } },
  });
}

/**
 * Confirmed crew per role, keyed by opening id. Assignments with no opening
 * (created before roles existed) land under the literal `unassigned` key so the
 * counts stay honest instead of being folded into an arbitrary role.
 */
export async function getActiveAssignmentCountsByOpening(shiftId: string) {
  const rows = await prisma.shiftAssignment.groupBy({
    by: ["openingId"],
    where: { shiftId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.CONFIRMED, AssignmentStatus.COMPLETED] } },
    _count: { _all: true },
  });

  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = row.openingId ?? "unassigned";
    counts[key] = (counts[key] ?? 0) + row._count._all;
    return counts;
  }, {});
}

/**
 * One assignment, with everything the worker needs to reach the venue.
 *
 * Scoped to the worker who owns it: an assignment belonging to someone else
 * returns `null`, so callers cannot render another worker's event details.
 */
export async function getWorkerAssignmentDetail(assignmentId: string, userId: string) {
  return prisma.shiftAssignment.findFirst({
    where: { id: assignmentId, userId },
    include: {
      attendance: true,
      shift: {
        include: {
          organizer: { select: { id: true, name: true, username: true, organizerProfile: true } },
        },
      },
    },
  });
}

/** Real, countable platform statistics. Zero really means zero. */
export async function getPlatformStats() {
  const [workers, organizers, openShifts] = await Promise.all([
    prisma.user.count({ where: { role: Role.WORKER, status: AccountStatus.ACTIVE } }),
    prisma.user.count({ where: { role: Role.ORGANIZER, status: AccountStatus.ACTIVE } }),
    prisma.shift.count({ where: { status: ShiftStatus.PUBLISHED } }),
  ]);

  return { workers, organizers, openShifts };
}

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      workerProfile: true,
      organizerProfile: true,
      // Only the metadata: the picture's bytes are served from /api/avatars.
      avatar: { select: { updatedAt: true, byteSize: true } },
    },
  });
}

/** Reviews a worker has received, newest first, with who wrote each one. */
export async function getWorkerReviews(workerId: string) {
  return prisma.review.findMany({
    where: { recipientId: workerId },
    include: {
      author: { select: { id: true, name: true, username: true, role: true } },
      assignment: { select: { shift: { select: { id: true, title: true, shiftDate: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * The assignment that makes a worker reviewable by this organizer, if it exists.
 * Returns null when the two have no working relationship on that shift, and the
 * nested `review` tells the caller whether one has already been left.
 */
export async function getReviewContext(input: {
  organizerId: string;
  workerId: string;
  shiftId: string;
  isAdmin?: boolean;
}) {
  return prisma.shiftAssignment.findFirst({
    where: {
      userId: input.workerId,
      shiftId: input.shiftId,
      ...(input.isAdmin ? {} : { shift: { organizerId: input.organizerId } }),
    },
    select: {
      id: true,
      status: true,
      shift: { select: { id: true, title: true, status: true, shiftDate: true } },
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
  });
}

/** True once the role-appropriate profile has been started and completed. */
export function isProfileComplete(
  user: { role: Role; workerProfile?: unknown; organizerProfile?: unknown } | null,
): boolean {
  if (!user) return false;
  if (user.role === Role.ORGANIZER) return Boolean(user.organizerProfile);
  if (user.role === Role.ADMIN) return true;
  return Boolean(user.workerProfile);
}
