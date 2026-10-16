import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

const workerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  city: z.string().trim().min(2, "Where are you based?").max(80),
  availability: z.string().trim().max(160).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  bio: z.string().trim().max(600).optional().default(""),
});

const organizerSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  companyName: z.string().trim().min(2, "What is your organisation called?").max(120),
  location: z.string().trim().min(2, "Where do you operate?").max(80),
  phone: z.string().trim().min(7, "Add a contact number.").max(24),
  description: z.string().trim().max(600).optional().default(""),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    if (user.role === Role.ORGANIZER) {
      const parsed = organizerSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Please review your details." },
          { status: 400 },
        );
      }

      const { name, companyName, location, phone, description } = parsed.data;

      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { name } }),
        prisma.organizerProfile.upsert({
          where: { userId: user.id },
          update: { companyName, location, phone, description: description || null },
          create: { userId: user.id, companyName, location, phone, description: description || null },
        }),
      ]);

      return NextResponse.json({ ok: true, redirectTo: "/organizer" });
    }

    const parsed = workerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please review your details." },
        { status: 400 },
      );
    }

    const { name, city, availability, skills, bio } = parsed.data;
    const cleanSkills = Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { name } }),
      prisma.workerProfile.upsert({
        where: { userId: user.id },
        update: { city, availability: availability || null, skills: cleanSkills, bio: bio || null },
        create: { userId: user.id, city, availability: availability || null, skills: cleanSkills, bio: bio || null },
      }),
    ]);

    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error("Onboarding save failed:", error);
    return NextResponse.json(
      { error: dbError ?? "We could not save your profile right now. Please try again." },
      { status: 503 },
    );
  }
}
