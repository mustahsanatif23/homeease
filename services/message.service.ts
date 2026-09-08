import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "@/services/notification.service";
import { ForbiddenError, NotFoundError, AppError } from "@/lib/errors";
import type { Role } from "@/lib/constants";

export const MAX_MESSAGE_LENGTH = 1000;

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  mine: boolean;
}

/** Both sides of a booking may read and write its thread; nobody else can. */
async function assertParticipant(bookingId: string, userId: string, role: Role) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true, status: true, customerId: true,
      customer: { select: { id: true, name: true } },
      provider: { select: { businessName: true, userId: true, user: { select: { name: true } } } },
      request: { select: { service: { select: { name: true } } } },
    },
  });
  if (!booking) throw new NotFoundError("We couldn't find that booking.");

  const isCustomer = booking.customerId === userId;
  const isProvider = booking.provider.userId === userId;
  if (!isCustomer && !isProvider && role !== "ADMIN") throw new ForbiddenError();

  return { booking, isCustomer, isProvider };
}

function shape(
  rows: { id: string; body: string; createdAt: Date; senderId: string; sender: { name: string } }[],
  viewerId: string,
): ChatMessage[] {
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    senderId: row.senderId,
    senderName: row.sender.name,
    mine: row.senderId === viewerId,
  }));
}

/** Returns the thread and marks everything from the other side as read. */
export async function getThread(bookingId: string, userId: string, role: Role) {
  const { booking, isCustomer, isProvider } = await assertParticipant(bookingId, userId, role);

  const rows = await prisma.message.findMany({
    where: { bookingId },
    include: { sender: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  if (isCustomer || isProvider) {
    await prisma.message.updateMany({
      where: { bookingId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const counterpart = isCustomer
    ? booking.provider.businessName
    : booking.customer.name;

  return {
    bookingId,
    counterpart,
    serviceName: booking.request.service.name,
    closed: ["CANCELLED", "REJECTED"].includes(booking.status),
    messages: shape(rows, userId),
  };
}

export async function sendMessage(params: { bookingId: string; senderId: string; role: Role; body: string }) {
  const body = params.body.trim();
  if (!body) throw new AppError("Type a message first.");
  if (body.length > MAX_MESSAGE_LENGTH) throw new AppError(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);

  const { booking, isCustomer } = await assertParticipant(params.bookingId, params.senderId, params.role);
  if (["CANCELLED", "REJECTED"].includes(booking.status)) {
    throw new AppError("This job is closed, so the chat is read-only.");
  }

  const message = await prisma.message.create({
    data: { bookingId: params.bookingId, senderId: params.senderId, body },
    include: { sender: { select: { name: true } } },
  });

  // The other side gets an in-app notification as well as the live thread.
  const recipientId = isCustomer ? booking.provider.userId : booking.customerId;
  const senderLabel = isCustomer ? booking.customer.name : booking.provider.businessName;
  await notify({
    userId: recipientId,
    type: "NEW_MESSAGE",
    title: `New message from ${senderLabel}`,
    message: body.length > 90 ? `${body.slice(0, 90)}…` : body,
    bookingId: params.bookingId,
  }).catch(() => undefined);

  return shape([message], params.senderId)[0];
}

/** Unread messages addressed to this user, across every booking they're part of. */
export async function unreadMessageCount(userId: string, providerId?: string) {
  return prisma.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      booking: providerId ? { providerId } : { customerId: userId },
    },
  });
}

/** Thread list for the messages page. */
export async function listThreads(userId: string, providerId?: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      ...(providerId ? { providerId } : { customerId: userId }),
      messages: { some: {} },
    },
    include: {
      request: { include: { service: { select: { name: true } } } },
      customer: { select: { name: true, avatar: true } },
      provider: { select: { businessName: true, user: { select: { avatar: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
      _count: { select: { messages: { where: { readAt: null, senderId: { not: userId } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return bookings.map((booking) => ({
    bookingId: booking.id,
    requestId: booking.requestId,
    status: booking.status,
    serviceName: booking.request.service.name,
    counterpart: providerId ? booking.customer.name : booking.provider.businessName,
    avatar: providerId ? booking.customer.avatar : booking.provider.user.avatar,
    lastMessage: booking.messages[0]?.body ?? "",
    lastSender: booking.messages[0]?.sender.name ?? "",
    lastAt: booking.messages[0]?.createdAt ?? booking.updatedAt,
    unread: booking._count.messages,
  }));
}
