import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashToken, readSessionToken } from "@/lib/session";
import type { Role } from "@/lib/constants";
import { ForbiddenError } from "@/lib/errors";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  accountStatus: string;
  avatar: string | null;
  address: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  providerId?: string;
  verificationStatus?: string;
  businessName?: string;
}

/** Deduped per request by React cache(). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { providerProfile: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  const user = session.user;
  if (!user || user.deletedAt) return null;
  if (user.accountStatus === "SUSPENDED" || user.accountStatus === "DEACTIVATED") return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as Role,
    accountStatus: user.accountStatus,
    avatar: user.avatar,
    address: user.address,
    area: user.area,
    latitude: user.latitude,
    longitude: user.longitude,
    createdAt: user.createdAt,
    providerId: user.providerProfile?.id,
    verificationStatus: user.providerProfile?.verificationStatus,
    businessName: user.providerProfile?.businessName,
  };
});

export async function requireAuth(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return user;
}

export async function requireRole(role: Role | Role[], nextPath?: string): Promise<SessionUser> {
  const user = await requireAuth(nextPath);
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export async function requireActiveUser(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.accountStatus !== "ACTIVE") redirect("/account-pending");
  return user;
}

/** Provider whose account has actually been approved by an admin. */
export async function requireApprovedProvider(): Promise<SessionUser & { providerId: string }> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) redirect("/login");
  return user as SessionUser & { providerId: string };
}

/** Throws instead of redirecting — for use inside server actions. */
export async function assertRole(user: SessionUser | null, role: Role | Role[]): Promise<void> {
  const allowed = Array.isArray(role) ? role : [role];
  if (!user || !allowed.includes(user.role)) throw new ForbiddenError();
}

export function homeFor(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "PROVIDER") return "/provider/dashboard";
  return "/dashboard";
}
