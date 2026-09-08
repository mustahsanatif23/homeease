import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  requestId?: string | null;
  bookingId?: string | null;
}

/** Creates a notification, de-duplicating the same event for the same entity. */
export async function notify(input: NotifyInput, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const existing = await client.notification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      relatedBookingId: input.bookingId ?? undefined,
      relatedRequestId: input.requestId ?? undefined,
    },
    select: { id: true },
  });
  if (existing) return existing;

  return client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedRequestId: input.requestId ?? null,
      relatedBookingId: input.bookingId ?? null,
    },
    select: { id: true },
  });
}

export async function listNotifications(userId: string, take = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { read: true } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
