import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Session, User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { signValue, verifySignedValue } from "@/lib/security";

const SESSION_COOKIE = "vendor_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  personId: string | null;
};

export async function createSessionForUser(user: User) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
    },
  });

  const signed = signValue(sessionId, env.SESSION_SECRET);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionCookie) {
    const parsed = verifySignedValue(sessionCookie, env.SESSION_SECRET);
    if (parsed.valid) {
      await prisma.session.deleteMany({
        where: { id: parsed.value },
      });
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAuthSession(): Promise<{ user: AuthUser; session: Session } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return null;
  }

  const parsed = verifySignedValue(sessionCookie, env.SESSION_SECRET);
  if (!parsed.valid) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: parsed.value },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.enabled) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return {
    session,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      enabled: session.user.enabled,
      personId: session.user.personId,
    },
  };
}

export async function getCurrentUser() {
  const data = await getAuthSession();
  return data?.user ?? null;
}

export async function requireAuth() {
  const data = await getAuthSession();
  if (!data) {
    redirect("/login");
  }
  return data.user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    redirect("/app");
  }
  return user;
}
