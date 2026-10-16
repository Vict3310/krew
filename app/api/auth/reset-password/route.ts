import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { hashPassword, hashToken } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = resetPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reset token or password." }, { status: 400 });
    }

    const tokenHash = hashToken(parsed.data.token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 410 });
    }

    const newPasswordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction(async (tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => unknown ? T : never) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.session.updateMany({
        where: { userId: resetToken.userId },
        data: { revokedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true, message: "Password reset complete. Please log in again." });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error(error);

    if (dbError) {
      return NextResponse.json({ error: dbError }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
