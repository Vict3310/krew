-- Venue navigation for Krew.
--
-- Purely additive: every column is nullable and there are no defaults, so
-- existing shifts, applications, assignments and attendance rows are untouched.
-- A shift without coordinates simply has no confirmed pin yet.

ALTER TABLE "Shift"
  ADD COLUMN IF NOT EXISTS "venueAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "locationPrecision" TEXT,
  ADD COLUMN IF NOT EXISTS "arrivalInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "arrivalContact" TEXT,
  ADD COLUMN IF NOT EXISTS "arrivalTime" TEXT;
