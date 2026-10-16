"use server";

import { z } from "zod";

import { getCurrentUser, hashPassword, isDemoAuthEnabled, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z.string().min(8, "Use at least 8 characters.").max(200),
  confirmPassword: z.string().min(1, "Re-enter your new password."),
});

export type ChangePasswordState = { ok: boolean; error?: string };

/**
 * Change the signed-in account's password.
 *
 * The current password is verified against the stored hash before anything is
 * written, so an unattended session cannot be used to lock the owner out.
 */
export async function changePassword(raw: unknown): Promise<ChangePasswordState> {
  if (isDemoAuthEnabled()) {
    return { ok: false, error: "Password changes are not available in demo mode." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review the form." };
  }

  const { currentPassword, newPassword, confirmPassword } = parsed.data;

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "The two new passwords do not match." };
  }

  if (newPassword === currentPassword) {
    return { ok: false, error: "Choose a password you have not just used." };
  }

  try {
    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!record) return { ok: false, error: "We could not find your account." };

    const currentIsValid = await verifyPassword(currentPassword, record.passwordHash);
    if (!currentIsValid) return { ok: false, error: "That current password is not correct." };

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to change password:", error);
    return { ok: false, error: "We could not update your password right now. Please try again." };
  }
}
