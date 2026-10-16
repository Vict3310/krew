/**
 * Human labels for stored enum values.
 *
 * The database keeps uppercase enum codes; the interface shows wording a person
 * would actually use. Both sides of the marketplace read from these maps, so a
 * status never reads one way on a worker screen and another way for an
 * organizer.
 */

/** Badge variants the label maps can ask for. */
export type StatusTone = "default" | "secondary" | "outline";

function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const APPLICATION_LABELS: Record<string, string> = {
  PENDING: "Awaiting decision",
  ACCEPTED: "Accepted",
  REJECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
};

export function applicationStatusLabel(status: string): string {
  return APPLICATION_LABELS[status] ?? humanize(status);
}

export function applicationStatusTone(status: string): StatusTone {
  if (status === "ACCEPTED") return "default";
  if (status === "REJECTED" || status === "WITHDRAWN") return "secondary";
  return "outline";
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  ASSIGNED: "Assigned",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function assignmentStatusLabel(status: string): string {
  return ASSIGNMENT_LABELS[status] ?? humanize(status);
}

export function assignmentStatusTone(status: string): StatusTone {
  if (status === "CONFIRMED" || status === "COMPLETED") return "default";
  if (status === "CANCELLED") return "secondary";
  return "outline";
}

const SHIFT_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Open",
  CANCELLED: "Cancelled",
  COMPLETED: "Filled",
};

export function shiftStatusLabel(status: string): string {
  return SHIFT_LABELS[status] ?? humanize(status);
}

export function shiftStatusTone(status: string): StatusTone {
  return status === "PUBLISHED" ? "default" : "secondary";
}

const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export function transactionStatusLabel(status: string): string {
  return TRANSACTION_STATUS_LABELS[status] ?? humanize(status);
}

/** Payout records store a free-text type such as `SHIFT_PAYMENT`. */
export function transactionTypeLabel(type: string): string {
  return humanize(type);
}
