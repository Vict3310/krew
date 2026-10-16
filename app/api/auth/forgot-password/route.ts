import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { generateToken, hashToken } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

const forgotPasswordSchema = z.object({
  email: z.email(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = forgotPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const resetToken = generateToken();
    const tokenHash = hashToken(resetToken);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    if (process.env.RESET_TOKEN_DEV_MODE === "true") {
      return NextResponse.json({
        ok: true,
        devResetToken: resetToken,
        message: "Development reset token generated. Use it in the reset-password page.",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists, a reset link will be sent to your email.",
    });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error(error);

    if (dbError) {
      return NextResponse.json({ error: dbError }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to process reset request." }, { status: 500 });
  }
}
