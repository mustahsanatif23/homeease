import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { recordAudit } from "@/services/audit.service";
import { notify } from "@/services/notification.service";
import { revokeAllSessions } from "@/lib/session";
import { geocodeArea } from "@/lib/maps";
import { AppError, NotFoundError } from "@/lib/errors";
import type { AccountStatus, Role } from "@/lib/constants";

export interface UserFilters {
  query?: string;
  role?: Role;
  status?: AccountStatus;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "name";
}

export async function listUsers(filters: UserFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, filters.pageSize ?? 12);
  const q = filters.query?.trim();

  const where = {
    deletedAt: null,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { accountStatus: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { id: q },
          ],
        }
      : {}),
  };

  const orderBy =
    filters.sort === "oldest" ? { createdAt: "asc" as const }
    : filters.sort === "name" ? { name: "asc" as const }
    : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { providerProfile: { select: { businessName: true, verificationStatus: true, rating: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      providerProfile: {
        include: {
          services: { include: { service: true } },
          availability: { orderBy: { dayOfWeek: "asc" } },
          reviews: { take: 5, orderBy: { createdAt: "desc" } },
        },
      },
      customerProfile: true,
      customerRequests: { include: { service: true }, orderBy: { createdAt: "desc" }, take: 10 },
      customerBookings: {
        include: { request: { include: { service: true } }, provider: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!user) throw new NotFoundError("We couldn't find that user.");

  const providerBookings = user.providerProfile
    ? await prisma.booking.findMany({
        where: { providerId: user.providerProfile.id },
        include: { request: { include: { service: true } }, customer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return { user, providerBookings };
}

async function activeAdminCount(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      accountStatus: "ACTIVE",
      deletedAt: null,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

/** The last active admin can never be locked out. */
export async function assertNotLastAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return;
  if ((await activeAdminCount(userId)) === 0) {
    throw new AppError("This is the last active admin — the account must stay active.");
  }
}

export async function setAccountStatus(params: { userId: string; status: AccountStatus; adminId: string }) {
  if (params.status !== "ACTIVE") await assertNotLastAdmin(params.userId);

  const user = await prisma.user.update({
    where: { id: params.userId },
    data: {
      accountStatus: params.status,
      deletedAt: params.status === "DEACTIVATED" ? new Date() : null,
    },
  });
  if (params.status !== "ACTIVE") await revokeAllSessions(params.userId);

  await notify({
    userId: params.userId,
    type: params.status === "ACTIVE" ? "ACCOUNT_ACTIVATED" : "ACCOUNT_SUSPENDED",
    title: params.status === "ACTIVE" ? "Account active" : `Account ${params.status.toLowerCase()}`,
    message:
      params.status === "ACTIVE"
        ? "Your HomeEase account is active again."
        : "Please contact support if you think this is a mistake.",
  }).catch(() => undefined);

  await recordAudit({
    userId: params.adminId,
    action: `USER_${params.status}`,
    entity: "User",
    entityId: params.userId,
    metadata: { status: params.status },
  });
  return user;
}

export async function changeRole(params: { userId: string; role: Role; adminId: string }) {
  if (params.role !== "ADMIN") await assertNotLastAdmin(params.userId);
  const user = await prisma.user.update({ where: { id: params.userId }, data: { role: params.role } });
  await revokeAllSessions(params.userId);
  await recordAudit({
    userId: params.adminId,
    action: "USER_ROLE_CHANGED",
    entity: "User",
    entityId: params.userId,
    metadata: { role: params.role },
  });
  return user;
}

export async function adminCreateUser(params: {
  adminId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  area: string;
  address: string;
}) {
  const exists = await prisma.user.findUnique({ where: { email: params.email } });
  if (exists) throw new AppError("An account with that email already exists.");
  const coords = geocodeArea(params.area);

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      phone: params.phone,
      passwordHash: await hashPassword(params.password),
      role: params.role,
      accountStatus: "ACTIVE",
      address: params.address,
      area: params.area,
      latitude: coords.latitude,
      longitude: coords.longitude,
      emailVerifiedAt: new Date(),
      ...(params.role === "CUSTOMER" ? { customerProfile: { create: {} } } : {}),
      ...(params.role === "PROVIDER"
        ? {
            providerProfile: {
              create: {
                businessName: `${params.name} Services`,
                verificationStatus: "PENDING",
                availability: {
                  create: Array.from({ length: 7 }, (_, day) => ({
                    dayOfWeek: day,
                    startTime: "09:00",
                    endTime: "18:00",
                    isAvailable: day !== 5,
                  })),
                },
              },
            },
          }
        : {}),
    },
  });

  await recordAudit({
    userId: params.adminId,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { role: params.role },
  });
  return user;
}

export async function updateProfile(userId: string, data: { name: string; phone: string; address: string; area: string }) {
  const coords = geocodeArea(data.area);
  return prisma.user.update({
    where: { id: userId },
    data: { ...data, latitude: coords.latitude, longitude: coords.longitude },
  });
}
