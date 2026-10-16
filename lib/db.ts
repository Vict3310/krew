import { PrismaClient } from "@prisma/client";

export function getResolvedDatabaseUrl() {
  const candidates = [process.env.NEON_DATABASE_URL, process.env.DATABASE_URL];

  for (const candidate of candidates) {
    const value = candidate?.trim();

    if (!value) {
      continue;
    }

    const isPlaceholder = /<[^>]+>/.test(value) || value.includes("<project-id>") || value.includes("<database-name>");

    if (isPlaceholder) {
      continue;
    }

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = value;
    }

    return value;
  }

  return "";
}

export function isDatabaseConfigured() {
  return Boolean(getResolvedDatabaseUrl().length > 0);
}

export function getDatabaseConfigError() {
  if (!isDatabaseConfigured()) {
    return "Database is not configured. Add DATABASE_URL or NEON_DATABASE_URL to .env.local before using the live database features.";
  }

  return null;
}

export function isDatabaseUnavailableError(error: unknown) {
  if (!error) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|ECONNREFUSED|Environment variable not found: DATABASE_URL|database.*not.*configured|ssl.*required|connection.*failed|timeout|invalid.*database string|provided database string is invalid|invalid domain character/i.test(message);
}

export function getDatabaseUnavailableMessage(error?: unknown) {
  if (error && isDatabaseUnavailableError(error)) {
    return "The database is unavailable right now. Check your Neon/Postgres connection string and ensure the server is reachable.";
  }

  return getDatabaseConfigError();
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const resolvedDatabaseUrl = getResolvedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: resolvedDatabaseUrl
      ? {
          db: {
            url: resolvedDatabaseUrl,
          },
        }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
