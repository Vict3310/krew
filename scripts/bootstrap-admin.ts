import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? process.env.BOOTSTRAP_ADMIN_EMAIL;

  if (!email) {
    throw new Error("Usage: npm run bootstrap-admin -- <user-email>");
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`Promoted ${user.email} to ADMIN.`);
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
