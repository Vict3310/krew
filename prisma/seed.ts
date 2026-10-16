import * as argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await argon2.hash("Admin@2026");
  const organizerHash = await argon2.hash("Organizer@2026");
  const workerHash = await argon2.hash("Worker@2026");

  await prisma.user.upsert({
    where: { email: "admin@eventcrew.ng" },
    update: {},
    create: {
      email: "admin@eventcrew.ng",
      username: "admincrew",
      passwordHash: adminHash,
      name: "Ada Okafor",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@eventcrew.ng" },
    update: {},
    create: {
      email: "organizer@eventcrew.ng",
      username: "lagosmiles",
      passwordHash: organizerHash,
      name: "Bola Adeyemi",
      role: "ORGANIZER",
      status: "ACTIVE",
    },
  });

  const worker = await prisma.user.upsert({
    where: { email: "worker@eventcrew.ng" },
    update: {},
    create: {
      email: "worker@eventcrew.ng",
      username: "eventguy",
      passwordHash: workerHash,
      name: "Kelechi Nnaji",
      role: "WORKER",
      status: "ACTIVE",
    },
  });

  await prisma.organizerProfile.upsert({
    where: { userId: organizer.id },
    update: {},
    create: {
      userId: organizer.id,
      companyName: "Lagos Event Studio",
      description: "Premium event staffing and guest experience for conferences, weddings and brand activations.",
      phone: "+234 801 222 8901",
      location: "Lagos",
    },
  });

  await prisma.workerProfile.upsert({
    where: { userId: worker.id },
    update: {},
    create: {
      userId: worker.id,
      bio: "Experienced usher, registration desk and event support professional.",
      skills: ["Guest check-in", "Crowd management", "VIP support"],
      city: "Abuja",
      availability: "Weekends and weeknights",
    },
  });

  const shiftOne = await prisma.shift.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      organizerId: organizer.id,
      title: "Festival Gate Team",
      category: "Security",
      description: "Manage visitor check-ins, queue flow and ticket validation for a festival weekend.",
      venue: "Eko Atlantic Event Grounds",
      location: "Lagos",
      shiftDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      startTime: "09:00",
      endTime: "17:00",
      compensation: 35000,
      requiredStaff: 8,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: "PUBLISHED",
    },
  });

  await prisma.shift.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      organizerId: organizer.id,
      title: "Wedding Reception Crew",
      category: "Hospitality",
      description: "Support guest coordination, table setup, and service flow during an evening reception.",
      venue: "The Grand Pavilion",
      location: "Abuja",
      shiftDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12),
      startTime: "15:00",
      endTime: "23:00",
      compensation: 28000,
      requiredStaff: 5,
      applicationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: "PUBLISHED",
    },
  });

  await prisma.shiftApplication.upsert({
    where: {
      userId_shiftId: {
        userId: worker.id,
        shiftId: shiftOne.id,
      },
    },
    update: {},
    create: {
      userId: worker.id,
      shiftId: shiftOne.id,
      status: "PENDING",
      coverNote: "I am available for festival crowd management and guest flow support.",
    },
  });

  await prisma.transactionRecord.createMany({
    data: [
      {
        userId: organizer.id,
        shiftId: shiftOne.id,
        type: "FUNDING",
        amount: 280000,
        status: "COMPLETED",
        reference: "EVT-INV-101",
        notes: "Allocated for staffing payout and site operations.",
      },
      {
        userId: worker.id,
        shiftId: shiftOne.id,
        type: "PAYOUT",
        amount: 20000,
        status: "PENDING",
        reference: "EVT-PAYOUT-101",
        notes: "Projected payout pending completion review.",
      },
    ],
  });

  console.log("Seed completed with admin, organizer, worker, and sample shifts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
