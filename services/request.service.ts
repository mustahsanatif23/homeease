import "server-only";
import { prisma } from "@/lib/db";
import { geocodeArea } from "@/lib/maps";
import { toDateOnly } from "@/lib/format";
import { findMatches, persistMatches, type MatchCandidate } from "@/services/matching.service";
import { estimatePrice } from "@/services/pricing.service";
import { notify } from "@/services/notification.service";
import { createBooking } from "@/services/booking.service";
import { recordAudit } from "@/services/audit.service";
import { endTimeFor } from "@/services/scheduling.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { ServiceRequestInput } from "@/schemas";

export async function createServiceRequest(customerId: string, input: ServiceRequestInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) throw new NotFoundError("That service is no longer available.");

  const coords = geocodeArea(input.area);
  const date = toDateOnly(input.preferredDate);
  const endTime = endTimeFor(input.preferredStartTime, service.estimatedDuration);
  const estimate = await estimatePrice({
    providerPrice: service.basePrice,
    distanceKm: 0,
    urgency: input.urgency,
  });

  const request = await prisma.serviceRequest.create({
    data: {
      customerId,
      serviceId: service.id,
      title: input.title,
      description: input.description,
      address: input.address,
      area: input.area,
      latitude: coords.latitude,
      longitude: coords.longitude,
      preferredDate: date,
      preferredStartTime: input.preferredStartTime,
      preferredEndTime: endTime,
      urgency: input.urgency,
      imageUrl: input.imageUrl || null,
      contactPhone: input.contactPhone,
      estimatedPrice: estimate.total,
      autoAssign: input.autoAssign ?? false,
      status: "PENDING",
    },
  });

  await notify({
    userId: customerId,
    type: "REQUEST_CREATED",
    title: "Request received",
    message: `We're finding the best providers for "${service.name}".`,
    requestId: request.id,
  });
  await recordAudit({ userId: customerId, action: "REQUEST_CREATED", entity: "ServiceRequest", entityId: request.id });

  return request;
}

/** Runs the matching engine for a request and stores the ranked shortlist. */
export async function matchRequest(requestId: string): Promise<MatchCandidate[]> {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new NotFoundError("We couldn't find that request.");

  const declined = await prisma.requestProviderMatch.findMany({
    where: { requestId, declined: true },
    select: { providerId: true },
  });

  const candidates = await findMatches({
    serviceId: request.serviceId,
    latitude: request.latitude,
    longitude: request.longitude,
    date: request.preferredDate,
    startTime: request.preferredStartTime,
    urgency: request.urgency as "NORMAL" | "HIGH" | "URGENT",
    excludeProviderIds: declined.map((d) => d.providerId),
  });

  await persistMatches(requestId, candidates);
  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: candidates.length ? "MATCHED" : "NO_PROVIDER",
      matchScore: candidates[0]?.matchScore ?? null,
    },
  });

  if (candidates.length) {
    await notify({
      userId: request.customerId,
      type: "PROVIDER_MATCHED",
      title: `${candidates.length} providers matched`,
      message: `Top match scores ${candidates[0]!.matchScore}% for your request.`,
      requestId,
    });
  }
  return candidates;
}

/** Automatic assignment: books the highest ranked eligible provider. */
export async function autoAssign(requestId: string) {
  const candidates = await matchRequest(requestId);
  if (!candidates.length) return null;
  const best = candidates[0]!;
  return createBooking({ requestId, providerId: best.providerId, actorRole: "SYSTEM" });
}

export async function getRequestForCustomer(requestId: string, customerId: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: {
      service: { include: { category: true } },
      provider: { include: { user: { select: { name: true, avatar: true, phone: true, area: true } } } },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: { invoice: true, review: true },
      },
    },
  });
  if (!request) throw new NotFoundError("We couldn't find that request.");
  // Ownership check — never trust an id coming from the client.
  if (request.customerId !== customerId) throw new ForbiddenError();
  return request;
}

export async function listCustomerRequests(customerId: string, statuses?: string[]) {
  return prisma.serviceRequest.findMany({
    where: { customerId, ...(statuses ? { status: { in: statuses } } : {}) },
    include: {
      service: true,
      provider: { include: { user: { select: { name: true } } } },
      bookings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelRequest(requestId: string, customerId: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { bookings: true },
  });
  if (!request) throw new NotFoundError();
  if (request.customerId !== customerId) throw new ForbiddenError();
  if (["COMPLETED", "CANCELLED"].includes(request.status)) return request;

  await prisma.$transaction(async (tx) => {
    await tx.serviceRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
    await tx.booking.updateMany({
      where: { requestId, status: { in: ["REQUESTED", "ACCEPTED", "RESCHEDULED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Cancelled by customer" },
    });
  });
  await recordAudit({ userId: customerId, action: "REQUEST_CANCELLED", entity: "ServiceRequest", entityId: requestId });
  return request;
}
