import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { geocodeArea } from "@/lib/maps";
import { recordAudit } from "@/services/audit.service";
import { notify } from "@/services/notification.service";
import { sendMail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import type { z } from "zod";
import type { customerRegisterSchema, providerRegisterSchema } from "@/schemas";

const GENERIC_LOGIN_ERROR = "That email and password combination doesn't match an account.";

export async function registerCustomer(input: z.infer<typeof customerRegisterSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError("An account with that email already exists.");
  const coords = geocodeArea(input.area);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: "CUSTOMER",
      accountStatus: "ACTIVE",
      address: input.address,
      area: input.area,
      latitude: coords.latitude,
      longitude: coords.longitude,
      customerProfile: { create: {} },
    },
  });

  await notify({
    userId: user.id,
    type: "ACCOUNT_ACTIVATED",
    title: "Welcome to HomeEase",
    message: "Book your first service and we'll find the best provider for you.",
  });
  await recordAudit({ userId: user.id, action: "USER_REGISTERED", entity: "User", entityId: user.id, metadata: { role: "CUSTOMER" } });
  return user;
}

export async function registerProvider(input: z.infer<typeof providerRegisterSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError("An account with that email already exists.");

  const services = await prisma.service.findMany({ where: { id: { in: input.serviceIds }, active: true } });
  if (services.length === 0) throw new AppError("Select at least one service you offer.");
  const coords = geocodeArea(input.area);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: "PROVIDER",
      accountStatus: "PENDING",
      address: input.address,
      area: input.area,
      latitude: coords.latitude,
      longitude: coords.longitude,
      providerProfile: {
        create: {
          businessName: input.businessName,
          experienceYears: input.experienceYears,
          serviceRadiusKm: input.serviceRadiusKm,
          verificationStatus: "PENDING",
          services: {
            create: services.map((s) => ({
              serviceId: s.id,
              price: s.basePrice,
              experienceYears: input.experienceYears,
              expertiseLevel: input.experienceYears >= 8 ? "EXPERT" : input.experienceYears >= 4 ? "ADVANCED" : "INTERMEDIATE",
            })),
          },
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
    },
  });

  await notify({
    userId: user.id,
    type: "ACCOUNT_ACTIVATED",
    title: "Application received",
    message: "An admin will review your profile shortly. You'll be notified once approved.",
  });
  await recordAudit({ userId: user.id, action: "PROVIDER_REGISTERED", entity: "User", entityId: user.id });
  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new AppError(GENERIC_LOGIN_ERROR);
  if (!(await verifyPassword(password, user.passwordHash))) throw new AppError(GENERIC_LOGIN_ERROR);
  if (user.accountStatus === "SUSPENDED") throw new AppError("This account is suspended. Please contact support.");
  if (user.accountStatus === "DEACTIVATED") throw new AppError(GENERIC_LOGIN_ERROR);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAudit({ userId: user.id, action: "USER_LOGIN", entity: "User", entityId: user.id });
  return user;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(`${token}${process.env.AUTH_SECRET ?? "dev"}`).digest("hex");
}

/**
 * Always resolves the same way so the endpoint never leaks whether an email
 * exists. In development the link is returned so it can be shown in the UI.
 */
export async function requestPasswordReset(email: string): Promise<{ devLink?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) return {};

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  const mail = await sendMail({
    to: email,
    subject: "Reset your HomeEase password",
    body: `Reset your password using this link (valid for one hour): ${link}`,
  });
  return mail.delivered ? {} : { devLink: link };
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("This reset link is invalid or has expired. Please request a new one.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Every other reset token and session for this user is invalidated.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit({ userId: record.userId, action: "PASSWORD_RESET", entity: "User", entityId: record.userId });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError("Your current password is incorrect.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  await recordAudit({ userId, action: "PASSWORD_CHANGED", entity: "User", entityId: userId });
}
