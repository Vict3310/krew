import { NextResponse, type NextRequest } from "next/server";

import { avatarUrl, validateAvatar } from "@/lib/avatar";
import { getCurrentUser } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

/**
 * Upload or replace the signed-in user's profile picture.
 *
 * The browser resizes the image before sending it, but the server is the
 * authority: the content type must be one of the accepted image types and the
 * size limit is enforced here, so a client cannot write an oversized row by
 * skipping the resize step.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the image as a file upload." }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  const check = validateAvatar({ mimeType: file.type, byteSize: data.byteLength });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  try {
    await prisma.userAvatar.upsert({
      where: { userId: user.id },
      update: { mimeType: check.mimeType, byteSize: data.byteLength, data },
      create: { userId: user.id, mimeType: check.mimeType, byteSize: data.byteLength, data },
    });

    // The version busts the browser's copy of the previous picture.
    return NextResponse.json({ ok: true, url: avatarUrl(user.id, Date.now()), byteSize: data.byteLength });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error("Avatar upload failed:", error);
    return NextResponse.json(
      { error: dbError ?? "We could not save your picture right now. Please try again." },
      { status: dbError ? 503 : 500 },
    );
  }
}

/** Remove the signed-in user's picture, returning them to initials. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  try {
    await prisma.userAvatar.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, url: avatarUrl(user.id, Date.now()) });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error("Avatar removal failed:", error);
    return NextResponse.json(
      { error: dbError ?? "We could not remove your picture right now. Please try again." },
      { status: dbError ? 503 : 500 },
    );
  }
}
