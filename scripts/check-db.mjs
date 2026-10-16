import fs from "fs";
import path from "path";

function redactValue(value) {
  if (!value) return "not set";
  if (value.includes("<") || value.includes(">")) return "placeholder detected";
  return "configured";
}

function getEnvValue(name) {
  const value = process.env[name] ?? "";
  return value.trim();
}

function parseHostFromDatabaseUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname || null;
  } catch {
    return null;
  }
}

const envFile = path.resolve(process.cwd(), ".env.local");
const databaseUrl = getEnvValue("DATABASE_URL");
const neonUrl = getEnvValue("NEON_DATABASE_URL");

console.log("Checking database configuration...\n");
console.log(`DATABASE_URL: ${redactValue(databaseUrl)}`);
console.log(`NEON_DATABASE_URL: ${redactValue(neonUrl)}`);

if (!databaseUrl && !neonUrl) {
  console.log("\nNo database connection string is configured. Add DATABASE_URL or NEON_DATABASE_URL to .env.local before connecting to Neon.");
  process.exit(0);
}

const selectedUrl = databaseUrl || neonUrl;
if (selectedUrl.includes("<") || selectedUrl.includes(">")) {
  console.log("\nPlaceholder detected. Replace the Neon connection string with the actual PostgreSQL URL from your Neon dashboard.");
  process.exit(0);
}

const host = parseHostFromDatabaseUrl(selectedUrl);
if (!host) {
  console.log("\nThe configured database URL is not a valid PostgreSQL URL. Check the host, port, username, password, and database name.");
  process.exit(0);
}

console.log(`Detected host: ${host}`);
console.log("\nPrisma and Neon are ready to be used when the database is reachable. If the app is not connecting, verify the host, SSL settings, and network access.");

if (fs.existsSync(envFile)) {
  const fileData = fs.readFileSync(envFile, "utf8");
  if (fileData.includes("<project-id>") || fileData.includes("<database-name>") || fileData.includes("<password>")) {
    console.log("\nThe local environment file still contains a Neon placeholder value. Replace it with the real connection string before running database operations.");
  }
}
