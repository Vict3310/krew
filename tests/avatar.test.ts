import { describe, expect, it } from "vitest";

import {
  ALLOWED_AVATAR_TYPES,
  AVATAR_MAX_EDGE,
  MAX_AVATAR_BYTES,
  avatarInitials,
  avatarUrl,
  isAllowedAvatarType,
  isUuid,
  maxAvatarSizeLabel,
  validateAvatar,
} from "@/lib/avatar";

describe("avatar upload validation", () => {
  it("accepts the image types we can actually serve", () => {
    for (const type of ALLOWED_AVATAR_TYPES) {
      expect(validateAvatar({ mimeType: type, byteSize: 1024 }).ok).toBe(true);
    }
  });

  it("accepts a content type that arrives upper case", () => {
    const result = validateAvatar({ mimeType: "IMAGE/PNG", byteSize: 2048 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.mimeType).toBe("image/png");
  });

  it("rejects anything that is not an accepted image type", () => {
    for (const type of ["", "text/plain", "application/pdf", "image/gif", "image/svg+xml"]) {
      expect(validateAvatar({ mimeType: type, byteSize: 1024 }).ok).toBe(false);
    }
    expect(validateAvatar({ mimeType: null, byteSize: 1024 }).ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const result = validateAvatar({ mimeType: "image/jpeg", byteSize: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/empty/i);
  });

  it("rejects a file over the limit and names the limit", () => {
    const result = validateAvatar({ mimeType: "image/jpeg", byteSize: MAX_AVATAR_BYTES + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(maxAvatarSizeLabel());
  });

  it("accepts a file exactly at the limit", () => {
    expect(validateAvatar({ mimeType: "image/jpeg", byteSize: MAX_AVATAR_BYTES }).ok).toBe(true);
  });

  it("only treats the listed types as allowed", () => {
    expect(isAllowedAvatarType("image/webp")).toBe(true);
    expect(isAllowedAvatarType("image/gif")).toBe(false);
  });
});

describe("avatar helpers", () => {
  it("builds initials from up to two names", () => {
    expect(avatarInitials("Ada Okafor")).toBe("AO");
    expect(avatarInitials("ada okafor")).toBe("AO");
    expect(avatarInitials("Chidi Nwosu Adeyemi")).toBe("CN");
    expect(avatarInitials("Prince")).toBe("P");
  });

  it("falls back to a placeholder when there is no name", () => {
    expect(avatarInitials("")).toBe("?");
    expect(avatarInitials(null)).toBe("?");
    expect(avatarInitials(undefined, "k")).toBe("K");
    expect(avatarInitials("   ")).toBe("?");
  });

  it("builds a versioned avatar address", () => {
    const id = "78447294-bd38-4a16-9b72-429cd309309c";
    expect(avatarUrl(id)).toBe(`/api/avatars/${id}`);
    expect(avatarUrl(id, 1700000000000)).toBe(`/api/avatars/${id}?v=1700000000000`);
    expect(avatarUrl(id, new Date(1700000000000))).toBe(`/api/avatars/${id}?v=1700000000000`);
    expect(avatarUrl(id, "")).toBe(`/api/avatars/${id}`);
  });

  it("guards against malformed ids before they reach the database", () => {
    expect(isUuid("78447294-bd38-4a16-9b72-429cd309309c")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("78447294-bd38-4a16-9b72")).toBe(false);
    expect(isUuid("")).toBe(false);
  });

  it("keeps the resize target small", () => {
    expect(AVATAR_MAX_EDGE).toBeLessThanOrEqual(1024);
  });
});
