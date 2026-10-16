import { NextResponse, type NextRequest } from "next/server";
import { Prisma, Role, ShiftStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to apply for a shift." }, { status: 401 });
  }

  // Only workers apply. Organizers and admins manage staffing, they do not take shifts.
  if (user.role !== Role.WORKER) {
    return NextResponse.json({ error: "Only worker accounts can apply for shifts." }, { status: 403 });
  }

  const { id: shiftId } = await params;
  const json = await request.json().catch(() => ({}));
  const coverNote = typeof json?.coverNote === "string" ? json.coverNote.trim().slice(0, 500) : undefined;

  try {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, title: true, status: true, applicationDeadline: true, organizerId: true },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found." }, { status: 404 });
    }

    if (shift.status !== ShiftStatus.PUBLISHED) {
      return NextResponse.json({ error: "This shift is not open for applications." }, { status: 400 });
    }

    if (shift.applicationDeadline.getTime() < Date.now()) {
      return NextResponse.json({ error: "Applications for this shift have closed." }, { status: 400 });
    }

    if (shift.organizerId === user.id) {
      return NextResponse.json({ error: "You cannot apply to your own shift." }, { status: 400 });
    }

    const existing = await prisma.shiftApplication.findUnique({
      where: { userId_shiftId: { userId: user.id, shiftId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied to this shift.", applicationId: existing.id, status: existing.status },
        { status: 409 },
      );
    }

    const application = await prisma.shiftApplication.create({
      data: { userId: user.id, shiftId, coverNote: coverNote || null },
    });

    return NextResponse.json({
      ok: true,
      message: "Application submitted successfully.",
      application: { id: application.id, status: application.status },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "You have already applied to this shift." }, { status: 409 });
    }

    const dbError = getDatabaseUnavailableMessage(error);
    console.error("Failed to create shift application:", error);
    return NextResponse.json(
      { error: dbError ?? "Unable to apply for this shift right now." },
      { status: dbError ? 503 : 500 },
    );
  }
}
