/**
 * Profile pictures.
 *
 * Avatars are stored in the database rather than object storage, so the two
 * rules that matter are what we accept and how big it is allowed to be. Both are
 * pure functions here, which keeps them unit testable without a request or a
 * database, and shared between the browser (which resizes before upload) and the
 * server (which is the authority on what is accepted).
 */

export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Small on purpose: these bytes live in a database row. */
export const MAX_AVATAR_BYTES = 1_500_000;

/** Longest edge the browser shrinks a picture to before uploading. */
export const AVATAR_MAX_EDGE = 512;

export function isAllowedAvatarType(mimeType: string | null | undefined): boolean {
  return (ALLOWED_AVATAR_TYPES as readonly string[]).includes((mimeType ?? "").trim().toLowerCase());
}

export type AvatarValidation = { ok: true; mimeType: string } | { ok: false; error: string };

/**
 * The one place an upload is judged. A missing or unexpected content type is
 * rejected rather than guessed at, and size is enforced here so a caller cannot
 * write an oversized row by skipping the client.
 */
export function validateAvatar(input: { mimeType?: string | null; byteSize: number }): AvatarValidation {
  const mimeType = (input.mimeType ?? "").trim().toLowerCase();

  if (!isAllowedAvatarType(mimeType)) {
    return { ok: false, error: "Choose a JPEG, PNG or WebP image." };
  }

  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) {
    return { ok: false, error: "That image looks empty. Please choose another one." };
  }

  if (input.byteSize > MAX_AVATAR_BYTES) {
    return { ok: false, error: `That image is too large. Keep it under ${maxAvatarSizeLabel()}.` };
  }

  return { ok: true, mimeType };
}

export function maxAvatarSizeLabel(): string {
  return `${(MAX_AVATAR_BYTES / 1_000_000).toFixed(1)} MB`;
}

/**
 * Up to two letters to show when there is no picture. Falls back to a question
 * mark so a nameless account never renders an empty circle.
 */
export function avatarInitials(name?: string | null, fallback = "?"): string {
  const source = (name ?? "").trim();
  if (!source) return fallback.toUpperCase();

  const letters = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return letters || fallback.toUpperCase();
}

/**
 * Where a user's picture is served from.
 *
 * `version` is appended when a caller knows it so a freshly uploaded picture is
 * not hidden by the browser's copy of the previous one.
 */
export function avatarUrl(userId: string, version?: string | number | Date | null): string {
  const base = `/api/avatars/${userId}`;
  if (version === undefined || version === null || version === "") return base;

  const stamp = version instanceof Date ? version.getTime() : version;
  return `${base}?v=${encodeURIComponent(String(stamp))}`;
}

/** UUID guard so a malformed id in the URL never reaches the database. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
