import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "homeease_session";
const SESSION_DAYS = 7;
const REMEMBER_DAYS = 30;

export function hashToken(token: string): string {
  return createHash("sha256").update(`${token}${process.env.AUTH_SECRET ?? "dev"}`).digest("hex");
}

export async function createSession(userId: string, remember = false, userAgent?: string) {
  const token = randomBytes(32).toString("hex");
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 86_400_000);

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 200) },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** Revokes the session server-side and clears the cookie. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
