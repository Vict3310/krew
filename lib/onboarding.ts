import { Role } from "@prisma/client";

/** Where a signed-in user should land once their profile is ready. */
export function getDashboardPathForRole(role: Role): string {
  if (role === Role.ORGANIZER) return "/organizer";
  if (role === Role.ADMIN) return "/admin";
  return "/dashboard";
}

/** Human labels for the two self-service roles. */
export const ROLE_LABELS: Record<string, string> = {
  WORKER: "Event worker",
  ORGANIZER: "Organizer",
  ADMIN: "Administrator",
};

export function parseSignupRole(value: string | null | undefined): "WORKER" | "ORGANIZER" {
  return value === "organizer" || value === "ORGANIZER" ? "ORGANIZER" : "WORKER";
}
