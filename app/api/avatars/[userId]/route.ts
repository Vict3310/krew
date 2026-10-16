import { NextResponse, type NextRequest } from "next/server";

import { AVATAR_MAX_EDGE, avatarInitials, isUuid } from "@/lib/avatar";
import { prisma } from "@/lib/db";

/**
 * Serve a user's profile picture.
 *
 * Every user has a picture address even when they have not uploaded one: the
 * fallback is an SVG of their initials, generated here. That keeps the caller
 * simple — it can always point an image at this route and get something
 * sensible — and keeps the "no picture" state honest rather than a broken image.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  // A malformed id is not worth a database round trip.
  if (!isUuid(userId)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const [avatar, user] = await Promise.all([
      prisma.userAvatar.findUnique({
        where: { userId },
        select: { data: true, mimeType: true, updatedAt: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    ]);

    if (!user) {
      return new NextResponse(null, { status: 404 });
    }

    if (avatar) {
      const bytes = new Uint8Array(avatar.data);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": avatar.mimeType,
          "Content-Length": String(bytes.byteLength),
          // Short cache: a new upload should appear quickly, and the client also
          // appends a version after it uploads.
          "Cache-Control": "public, max-age=60, must-revalidate",
          "Last-Modified": avatar.updatedAt.toUTCString(),
        },
      });
    }

    return new NextResponse(initialsSvg(avatarInitials(user.name ?? user.username)), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        // Deliberately shorter than a real picture, because this state changes as
        // soon as the user uploads one.
        "Cache-Control": "public, max-age=15, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Avatar read failed:", error);
    return new NextResponse(null, { status: 503 });
  }
}

/**
 * XML escape. Initials are derived from a user-controlled name and are placed
 * inside SVG markup, so they must never be able to close a tag or an attribute.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** A flat initials badge used until a real picture exists. */
function initialsSvg(initials: string): string {
  const safe = escapeXml(initials);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR_MAX_EDGE}" height="${AVATAR_MAX_EDGE}" viewBox="0 0 ${AVATAR_MAX_EDGE} ${AVATAR_MAX_EDGE}" role="img" aria-label="${safe}">
  <rect width="${AVATAR_MAX_EDGE}" height="${AVATAR_MAX_EDGE}" fill="#5B3DF5"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="${Math.round(AVATAR_MAX_EDGE * 0.4)}" font-weight="600">${safe}</text>
</svg>`;
}
