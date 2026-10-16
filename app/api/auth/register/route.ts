import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { buildDemoUserFromRegistration, hashPassword, isDemoAuthEnabled, issueSession } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";
import { createDemoOtp } from "@/lib/verification";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  // Only the two self-service roles exist. ADMIN can never be self-assigned:
  // it is granted out-of-band with `npm run bootstrap-admin`.
  role: z.enum(["WORKER", "ORGANIZER"]).default("WORKER"),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide a valid name, unique username, email, and a strong password." },
        { status: 400 },
      );
    }

    const { name, email, username, password, role } = parsed.data;

    if (isDemoAuthEnabled()) {
      const demoUser = { ...buildDemoUserFromRegistration({ name, email, username, password }), role };
      const demoOtp = createDemoOtp(demoUser.email, 6);
      await issueSession(demoUser.id, request.headers.get("user-agent") ?? undefined, request.headers.get("x-forwarded-for") ?? undefined);

      return NextResponse.json({
        ok: true,
        demoOtp,
        demoMode: true,
        message: "Demo OTP created. Use the code shown in the form to continue with the demo flow.",
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          username: demoUser.username,
          role: demoUser.role,
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with that email or username already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        role,
        status: "ACTIVE",
      },
    });

    await issueSession(
      user.id,
      request.headers.get("user-agent") ?? undefined,
      request.headers.get("x-forwarded-for") ?? undefined,
    );

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    const dbError = getDatabaseUnavailableMessage(error);
    console.error(error);

    if (dbError) {
      return NextResponse.json({ error: dbError }, { status: 503 });
    }

    return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 500 });
  }
}
