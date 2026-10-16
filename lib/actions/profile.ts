"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const commonSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, dashes or underscores only."),
});

const workerSchema = commonSchema.extend({
  city: z.string().trim().max(80).optional().default(""),
  availability: z.string().trim().max(160).optional().default(""),
  bio: z.string().trim().max(600).optional().default(""),
});

const organizerSchema = commonSchema.extend({
  companyName: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(24).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
});

export type ProfileActionState = { ok: boolean; error?: string };

export async function updateProfile(raw: unknown): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  try {
    if (user.role === Role.ORGANIZER) {
      const parsed = organizerSchema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review your details." };

      const { name, username, companyName, location, phone, description } = parsed.data;

      const clash = await prisma.user.findFirst({ where: { username, NOT: { id: user.id } }, select: { id: true } });
      if (clash) return { ok: false, error: "That username is already taken." };

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { name, username } }),
        prisma.organizerProfile.upsert({
          where: { userId: user.id },
          update: { companyName, location, phone, description: description || null },
          create: { userId: user.id, companyName, location, phone, description: description || null },
        }),
      ]);
    } else {
      const parsed = workerSchema.safeParse(raw);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please review your details." };

      const { name, username, city, availability, bio } = parsed.data;

      const clash = await prisma.user.findFirst({ where: { username, NOT: { id: user.id } }, select: { id: true } });
      if (clash) return { ok: false, error: "That username is already taken." };

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { name, username } }),
        prisma.workerProfile.upsert({
          where: { userId: user.id },
          update: { city: city || null, availability: availability || null, bio: bio || null },
          create: { userId: user.id, city: city || null, availability: availability || null, bio: bio || null },
        }),
      ]);
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/organizer");
    return { ok: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { ok: false, error: "We could not save your profile right now. Please try again." };
  }
}
