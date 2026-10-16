/**
 * QA fixtures for the venue navigation feature.
 *
 * Creates two worker accounts and two organizer-owned shifts:
 *
 *   - "QA · Confirmed venue"   → real coordinates, EXACT precision, arrival instructions
 *   - "QA · Unconfirmed venue" → no coordinates at all
 *
 * Both are assigned (CONFIRMED) to the QA worker so the assignment page and the
 * route preview can be exercised for real. Everything it writes is namespaced
 * with the `qa.` username prefix and the `QA ·` shift title prefix, and it only
 * ever deletes rows it previously created.
 *
 * Usage:
 *   set -a && . ./.env.local && set +a && node scripts/qa-venue-fixtures.mjs
 */
import * as argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const QA_WORKER_EMAIL = "qa.worker@krew.test";
const QA_ORGANIZER_EMAIL = "qa.organizer@krew.test";
const QA_PASSWORD = "QaVenue@2026";
const QA_TITLE_PREFIX = "QA · ";

async function upsertUser({ email, username, name, role, withProfile }) {
  const passwordHash = await argon2.hash(QA_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, status: "ACTIVE", passwordHash },
    create: { email, username, name, role, status: "ACTIVE", passwordHash },
  });

  if (withProfile === "worker") {
    await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: { city: "Lagos", availability: "Weekends" },
      create: { userId: user.id, city: "Lagos", availability: "Weekends" },
    });
  }

  if (withProfile === "organizer") {
    await prisma.organizerProfile.upsert({
      where: { userId: user.id },
      update: { companyName: "QA Venue Events", location: "Lagos", phone: "+234 800 000 0000" },
      create: {
        userId: user.id,
        companyName: "QA Venue Events",
        location: "Lagos",
        phone: "+234 800 000 0000",
      },
    });
  }

  return user;
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 86_400_000);
}

async function main() {
  const worker = await upsertUser({
    email: QA_WORKER_EMAIL,
    username: "qa.worker",
    name: "QA Worker",
    role: "WORKER",
    withProfile: "worker",
  });

  const organizer = await upsertUser({
    email: QA_ORGANIZER_EMAIL,
    username: "qa.organizer",
    name: "QA Organizer",
    role: "ORGANIZER",
    withProfile: "organizer",
  });

  // Only this script's own rows are removed, so re-running stays idempotent.
  await prisma.shift.deleteMany({
    where: { organizerId: organizer.id, title: { startsWith: QA_TITLE_PREFIX } },
  });

  const withCoordinates = await prisma.shift.create({
    data: {
      organizerId: organizer.id,
      title: `${QA_TITLE_PREFIX}Confirmed venue`,
      category: "Ushering",
      description:
        "QA fixture: a staffing request whose venue has been confirmed by the organizer, with arrival instructions attached.",
      venue: "Eko Convention Centre",
      location: "Lagos",
      venueAddress: "Eko Convention Centre, Plot 1415 Adetokunbo Ademola Street, Victoria Island, Lagos",
      latitude: 6.4281,
      longitude: 3.4219,
      locationPrecision: "EXACT",
      arrivalInstructions:
        "Use the staff gate on the left of the main entrance. Ask for the crew lead at the security post. Do not join the guests' queue.",
      arrivalContact: "Bola (crew lead) — 0801 222 8901",
      arrivalTime: "08:30",
      shiftDate: daysFromNow(10),
      startTime: "09:00",
      endTime: "17:00",
      compensation: 45000,
      requiredStaff: 4,
      applicationDeadline: daysFromNow(5),
      status: "PUBLISHED",
    },
  });

  const withoutCoordinates = await prisma.shift.create({
    data: {
      organizerId: organizer.id,
      title: `${QA_TITLE_PREFIX}Unconfirmed venue`,
      category: "Setup & teardown",
      description:
        "QA fixture: a staffing request where the organizer has not confirmed coordinates, so the interface must admit it rather than guess.",
      venue: "Private compound, Lekki Phase 1",
      location: "Lagos",
      locationPrecision: null,
      shiftDate: daysFromNow(12),
      startTime: "10:00",
      endTime: "16:00",
      compensation: 38000,
      requiredStaff: 3,
      applicationDeadline: daysFromNow(6),
      status: "PUBLISHED",
    },
  });

  const assignments = [];
  for (const shift of [withCoordinates, withoutCoordinates]) {
    const assignment = await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: shift.id, userId: worker.id } },
      update: { status: "CONFIRMED" },
      create: { shiftId: shift.id, userId: worker.id, status: "CONFIRMED", assignedById: organizer.id },
    });

    await prisma.shiftApplication.upsert({
      where: { userId_shiftId: { userId: worker.id, shiftId: shift.id } },
      update: { status: "ACCEPTED" },
      create: { userId: worker.id, shiftId: shift.id, status: "ACCEPTED", coverNote: "QA fixture application." },
    });

    assignments.push({ title: shift.title, shiftId: shift.id, assignmentId: assignment.id });
  }

  console.log(
    JSON.stringify(
      {
        worker: { email: QA_WORKER_EMAIL, password: QA_PASSWORD, id: worker.id },
        organizer: { email: QA_ORGANIZER_EMAIL, password: QA_PASSWORD, id: organizer.id },
        assignments,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
