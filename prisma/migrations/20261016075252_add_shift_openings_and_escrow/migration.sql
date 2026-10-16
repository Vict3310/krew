-- CreateEnum
CREATE TYPE "FundingStatus" AS ENUM ('UNFUNDED', 'FUNDED', 'RELEASED', 'REFUNDED');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "escrowAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fundedAt" TIMESTAMP(3),
ADD COLUMN     "fundingStatus" "FundingStatus" NOT NULL DEFAULT 'UNFUNDED',
ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShiftApplication" ADD COLUMN     "openingId" UUID;

-- AlterTable
ALTER TABLE "ShiftAssignment" ADD COLUMN     "openingId" UUID;

-- CreateTable
CREATE TABLE "ShiftOpening" (
    "id" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftOpening_shiftId_idx" ON "ShiftOpening"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftApplication_openingId_idx" ON "ShiftApplication"("openingId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_openingId_idx" ON "ShiftAssignment"("openingId");

-- AddForeignKey
ALTER TABLE "ShiftOpening" ADD CONSTRAINT "ShiftOpening_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftApplication" ADD CONSTRAINT "ShiftApplication_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "ShiftOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "ShiftOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
