import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { type User, AccountStatus, Role } from "@prisma/client";
import * as argon2 from "argon2";

import { demoPersonas, getDemoStore, getDemoUserById } from "@/lib/demo-store";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE_NAME = "eventcrew_session";

export type SafeUser = User;

const demoSessions = new Map<string, { user: SafeUser; expiresAt: number }>();

export function isDemoAuthEnabled() {
  return process.env.DEMO_AUTH === "true" || process.env.NEXT_PUBLIC_DEMO_AUTH === "true";
}

export function buildDemoUserFromLogin(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim();
  const normalizedPassword = password.trim();
  const knownDemoUser = demoPersonas.find((persona) => {
    const candidateValues = [persona.email, persona.username, persona.name].map((value) => value.toLowerCase());
    return candidateValues.includes(normalizedIdentifier.toLowerCase()) || candidateValues.includes(normalizedIdentifier.toLowerCase().replace(/\s+/g, "."));
  });

  if (knownDemoUser && normalizedPassword === knownDemoUser.password) {
    return {
      id: knownDemoUser.id,
      email: knownDemoUser.email,
      username: knownDemoUser.username,
      name: knownDemoUser.name,
      role: knownDemoUser.role,
      status: knownDemoUser.status,
      passwordHash: hashToken(normalizedPassword),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies SafeUser;
  }

  const safeIdentifier = normalizedIdentifier;
  const rawUsername = safeIdentifier.includes("@") ? safeIdentifier.split("@")[0] : safeIdentifier;
  const username = rawUsername.replace(/[^a-zA-Z0-9_]/g, "") || "demo";
  const email = safeIdentifier.includes("@") ? safeIdentifier.toLowerCase() : `${username.toLowerCase()}@demo.local`;

  return {
    id: `demo-user-${hashToken(`${email}:${password}`).slice(0, 16)}`,
    email,
    username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    role: Role.WORKER,
    status: AccountStatus.ACTIVE,
    passwordHash: hashToken(password),
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies SafeUser;
}

export function getDemoUser() {
  return getDemoUserById("ada-worker") ?? getDemoStore().users[0] ?? buildDemoUserFromLogin("demo@example.com", "Password123!");
}

export function buildDemoUserFromRegistration(values: {
  name: string;
  email: string;
  username: string;
  password: string;
}) {
  const email = values.email.trim().toLowerCase();
  const username = values.username.trim() || "demo";

  return {
    id: `demo-user-${hashToken(`${email}:${username}:${values.password}`).slice(0, 16)}`,
    email,
    username,
    name: values.name.trim() || username,
    role: Role.WORKER,
    status: AccountStatus.ACTIVE,
    passwordHash: hashToken(values.password),
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies SafeUser;
}

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return argon2.verify(passwordHash, password);
}

export async function issueSession(userId: string, userAgent?: string, ipAddress?: string) {
  if (isDemoAuthEnabled()) {
    const seededDemoUser = getDemoUserById(userId) ?? buildDemoUserFromLogin(userId, "demo-password");
    const demoUser = {
      ...seededDemoUser,
      passwordHash: hashToken(seededDemoUser.email + ":demo-password"),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies SafeUser;
    const rawToken = `demo:${demoUser.id}`;

    demoSessions.set(rawToken, {
      user: demoUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    (await cookies()).set(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { id: rawToken, user: demoUser };
  }

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const newSession = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
    include: { user: true },
  });

  (await cookies()).set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return newSession;
}

export async function getSessionFromRequest() {
  if (isDemoAuthEnabled()) {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const selectedUserId = rawToken?.startsWith("demo:") ? rawToken.replace(/^demo:/, "") : null;
    const demoUser = selectedUserId ? getDemoUserById(selectedUserId) ?? getDemoUser() : getDemoUser();

    return {
      id: rawToken ?? "demo-session",
      userId: demoUser.id,
      user: demoUser,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      revokedAt: null,
      userAgent: null,
      ipAddress: null,
    };
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  const demoSession = demoSessions.get(rawToken);
  if (demoSession) {
    if (demoSession.expiresAt < Date.now()) {
      demoSessions.delete(rawToken);
      return null;
    }

    return {
      id: rawToken,
      userId: demoSession.user.id,
      user: demoSession.user,
      expiresAt: new Date(demoSession.expiresAt),
      revokedAt: null,
      userAgent: null,
      ipAddress: null,
    };
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  if (session.user.status === AccountStatus.SUSPENDED) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSessionFromRequest();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function revokeSessionByToken(token: string) {
  if (isDemoAuthEnabled()) {
    demoSessions.delete(token);
    return;
  }

  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
}

export async function logoutCurrentUser() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    await revokeSessionByToken(rawToken);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
