import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { buildDemoUserFromLogin, isDemoAuthEnabled, issueSession, verifyPassword } from "@/lib/auth";
import { getDatabaseUnavailableMessage, prisma } from "@/lib/db";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Missing or invalid login details." }, { status: 400 });
    }

    const { identifier, password } = parsed.data;

    if (isDemoAuthEnabled()) {
      const demoUser = buildDemoUserFromLogin(identifier, password);
      await issueSession(demoUser.id, request.headers.get("user-agent") ?? undefined, request.headers.get("x-forwarded-for") ?? undefined);

      return NextResponse.json({
        ok: true,
        user: {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          username: demoUser.username,
          role: demoUser.role,
        },
      });
    }

    const normalizedIdentifier = identifier.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedIdentifier.toLowerCase() },
          { username: normalizedIdentifier },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid login credentials." }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid login credentials." }, { status: 401 });
    }

    await prisma.session.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
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

    return NextResponse.json({ error: "Unable to login right now." }, { status: 500 });
  }
}
