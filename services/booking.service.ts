import "server-only";
import { prisma } from "@/lib/db";
import { canTransition, canActorTransition, haversineKm } from "@/lib/core.mjs";
import { slotFreeInCalendar, loadCalendars, endTimeFor, isSlotFree } from "@/services/scheduling.service";
import { notify } from "@/services/notification.service";
import { recordAudit } from "@/services/audit.service";
import { generateInvoice } from "@/services/invoice.service";
import { estimatePrice } from "@/services/pricing.service";
import { toDateOnly } from "@/lib/format";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { CUSTOMER_STATUS_MESSAGE } from "@/lib/constants";
import type { BookingStatus, Role } from "@/lib/constants";

interface CreateBookingInput {
  requestId: string;
  providerId: string;
  actorRole: Role | "SYSTEM";
  actorId?: string;
  startTime?: string;
}

/**
 * Atomic booking creation.
 *
 * Double booking is prevented three times over: the matching engine never offers
 * a taken slot, this function re-checks inside a transaction, and the database
 * holds a unique constraint on (providerId, scheduledDate, startTime).
 */
export async function createBooking(input: CreateBookingInput) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: input.requestId },
    include: { service: true },
  });
  if (!request) throw new NotFoundError("We couldn't find that request.");
  if (["CANCELLED", "COMPLETED"].includes(request.status)) {
    throw new AppError("This request is already closed.");
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { id: input.providerId },
    include: { user: true, services: { where: { serviceId: request.serviceId } } },
  });
  if (!provider) throw new NotFoundError("We couldn't find that provider.");
  if (provider.verificationStatus !== "APPROVED" || provider.user.accountStatus !== "ACTIVE") {
    throw new AppError("That provider isn't accepting jobs right now.");
  }
  const offer = provider.services[0];
  if (!offer) throw new AppError("That provider doesn't offer this service.");

  const date = toDateOnly(request.preferredDate);
  const calendars = await loadCalendars([provider.id], date);
  const startTime = input.startTime ?? request.preferredStartTime;
  const endTime = endTimeFor(startTime, request.service.estimatedDuration);

  if (!slotFreeInCalendar(calendars.get(provider.id), startTime, endTime)) {
    throw new ConflictError("That time slot is no longer available. Please pick another slot.");
  }

  const distanceKm =
    provider.user.latitude != null && provider.user.longitude != null
      ? haversineKm(request.latitude, request.longitude, provider.user.latitude, provider.user.longitude)
      : 0;
  const pricing = await estimatePrice({
    providerPrice: offer.price,
    distanceKm,
    urgency: request.urgency as "NORMAL" | "HIGH" | "URGENT",
  });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to close the race window.
      const clash = await tx.booking.findFirst({
        where: {
          providerId: provider.id,
          scheduledDate: date,
          status: { in: ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULED"] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
        select: { id: true },
      });
      if (clash) throw new ConflictError();

      const created = await tx.booking.create({
        data: {
          requestId: request.id,
          providerId: provider.id,
          customerId: request.customerId,
          scheduledDate: date,
          startTime,
          endTime,
          status: "REQUESTED",
          price: pricing.total,
        },
      });

      await tx.serviceRequest.update({
        where: { id: request.id },
        data: { providerId: provider.id, status: "BOOKED", estimatedPrice: pricing.total },
      });

      await notify({
        userId: provider.userId,
        type: "BOOKING_CREATED",
        title: "New job request",
        message: `${request.service.name} in ${request.area} on ${date.toDateString()}.`,
        requestId: request.id,
        bookingId: created.id,
      }, tx);

      await notify({
        userId: request.customerId,
        type: "BOOKING_CREATED",
        title: "Request sent to provider",
        message: `${provider.businessName} has been asked to confirm your booking.`,
        requestId: request.id,
        bookingId: created.id,
      }, tx);

      return created;
    });

    await recordAudit({
      userId: input.actorId ?? request.customerId,
      action: "BOOKING_CREATED",
      entity: "Booking",
      entityId: booking.id,
      metadata: { providerId: provider.id, auto: input.actorRole === "SYSTEM" },
    });
    return booking;
  } catch (error) {
    // Unique constraint fired: another booking won the same slot.
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      throw new ConflictError();
    }
    throw error;
  }
}

export interface TransitionInput {
  bookingId: string;
  to: BookingStatus;
  actorId: string;
  actorRole: Role;
  reason?: string;
}

/** The single place a booking status may change. */
export async function transitionBooking(input: TransitionInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      provider: { include: { user: true } },
      request: { include: { service: true } },
      customer: { select: { id: true, name: true } },
    },
  });
  if (!booking) throw new NotFoundError("We couldn't find that booking.");

  // Ownership: providers only touch their own jobs, customers only their own bookings.
  if (input.actorRole === "PROVIDER" && booking.provider.userId !== input.actorId) throw new ForbiddenError();
  if (input.actorRole === "CUSTOMER" && booking.customerId !== input.actorId) throw new ForbiddenError();

  if (!canActorTransition(input.actorRole, input.to)) throw new ForbiddenError("You can't make that change.");
  if (!canTransition(booking.status, input.to)) {
    throw new AppError(`A booking that is "${booking.status}" can't move to "${input.to}".`);
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: input.to };
  if (input.to === "ACCEPTED") data.acceptedAt = now;
  if (input.to === "IN_PROGRESS") data.startedAt = now;
  if (input.to === "COMPLETED") data.completedAt = now;
  if (input.to === "CANCELLED" || input.to === "REJECTED") {
    data.cancelledAt = now;
    data.cancelReason = input.reason ?? null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({ where: { id: booking.id }, data });

    if (input.to === "ACCEPTED") {
      await tx.providerProfile.update({
        where: { id: booking.providerId },
        data: { acceptedCount: { increment: 1 } },
      });
      await tx.serviceRequest.update({ where: { id: booking.requestId }, data: { status: "ASSIGNED" } });
    }

    if (input.to === "COMPLETED") {
      await tx.providerProfile.update({
        where: { id: booking.providerId },
        data: { completedJobs: { increment: 1 }, totalEarnings: { increment: booking.price } },
      });
      await tx.serviceRequest.update({
        where: { id: booking.requestId },
        data: { status: "COMPLETED", finalPrice: booking.price },
      });
      await tx.customerProfile.updateMany({
        where: { userId: booking.customerId },
        data: { totalSpent: { increment: booking.price }, totalJobs: { increment: 1 } },
      });
    }

    if (input.to === "REJECTED" || input.to === "CANCELLED") {
      await tx.providerProfile.update({
        where: { id: booking.providerId },
        data: { cancelledJobs: { increment: 1 } },
      });
      await tx.requestProviderMatch.updateMany({
        where: { requestId: booking.requestId, providerId: booking.providerId },
        data: { declined: true },
      });
      await tx.serviceRequest.update({
        where: { id: booking.requestId },
        data: { status: input.to === "REJECTED" ? "PENDING" : "CANCELLED", providerId: null },
      });
    }

    return result;
  });

  const typeMap: Record<string, string> = {
    ACCEPTED: "BOOKING_ACCEPTED",
    REJECTED: "BOOKING_REJECTED",
    ON_THE_WAY: "PROVIDER_ON_WAY",
    IN_PROGRESS: "SERVICE_STARTED",
    COMPLETED: "SERVICE_COMPLETED",
    CANCELLED: "BOOKING_CANCELLED",
    RESCHEDULED: "BOOKING_RESCHEDULED",
  };

  await notify({
    userId: booking.customerId,
    type: typeMap[input.to] ?? "BOOKING_CREATED",
    title: booking.request.service.name,
    message: CUSTOMER_STATUS_MESSAGE[input.to] ?? "Your booking was updated.",
    requestId: booking.requestId,
    bookingId: booking.id,
  });

  if (input.to === "COMPLETED") {
    await generateInvoice(booking.id);
    await notify({
      userId: booking.customerId,
      type: "REVIEW_REQUESTED",
      title: "How did it go?",
      message: `Rate ${booking.provider.businessName} and help other customers choose.`,
      requestId: booking.requestId,
      bookingId: booking.id,
    });
  }

  if (input.to === "REJECTED") {
    await notify({
      userId: booking.customerId,
      type: "BOOKING_REJECTED",
      title: "Finding you a replacement",
      message: "Your provider couldn't take the job — we're re-matching now.",
      requestId: booking.requestId,
    });
  }

  await recordAudit({
    userId: input.actorId,
    action: `BOOKING_${input.to}`,
    entity: "Booking",
    entityId: booking.id,
    metadata: { from: booking.status, to: input.to },
  });

  return updated;
}

export async function rescheduleBooking(params: {
  bookingId: string;
  scheduledDate: string;
  startTime: string;
  actorId: string;
  actorRole: Role;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: { request: { include: { service: true } }, provider: true },
  });
  if (!booking) throw new NotFoundError();
  if (params.actorRole === "PROVIDER" && booking.provider.userId !== params.actorId) throw new ForbiddenError();
  if (params.actorRole === "CUSTOMER" && booking.customerId !== params.actorId) throw new ForbiddenError();
  if (["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.status)) {
    throw new AppError("This booking can no longer be rescheduled.");
  }

  const date = toDateOnly(params.scheduledDate);
  const endTime = endTimeFor(params.startTime, booking.request.service.estimatedDuration);
  const free = await isSlotFree(booking.providerId, date, params.startTime, endTime);
  if (!free) throw new ConflictError("That slot isn't free. Please choose another.");

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { scheduledDate: date, startTime: params.startTime, endTime, status: "ACCEPTED" },
  });

  await notify({
    userId: booking.customerId,
    type: "BOOKING_RESCHEDULED",
    title: "Booking rescheduled",
    message: `Your ${booking.request.service.name} is now on ${date.toDateString()} at ${params.startTime}.`,
    requestId: booking.requestId,
    bookingId: booking.id,
  });
  await recordAudit({
    userId: params.actorId,
    action: "BOOKING_RESCHEDULED",
    entity: "Booking",
    entityId: booking.id,
    metadata: { date: params.scheduledDate, startTime: params.startTime },
  });
  return updated;
}

export async function getBookingForUser(bookingId: string, userId: string, role: Role) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      request: { include: { service: { include: { category: true } } } },
      provider: { include: { user: { select: { name: true, phone: true, avatar: true, area: true } } } },
      customer: { select: { id: true, name: true, phone: true, address: true, avatar: true } },
      invoice: true,
      review: true,
    },
  });
  if (!booking) throw new NotFoundError();
  if (role === "CUSTOMER" && booking.customerId !== userId) throw new ForbiddenError();
  if (role === "PROVIDER" && booking.provider.userId !== userId) throw new ForbiddenError();
  return booking;
}
