import "server-only";
import { prisma } from "@/lib/db";
import {
  availabilityScore, distanceScore, ratingScore, priceScore, workloadScore,
  computeMatchScore, resolveWeights, matchReasons, EXPERTISE_SCORE, haversineKm, etaMinutes,
} from "@/lib/core.mjs";
import { getMatchingConfig } from "@/services/config.service";
import { computePricing } from "@/lib/core.mjs";
import { loadCalendars, slotFreeInCalendar, alternativeSlotInCalendar, endTimeFor } from "@/services/scheduling.service";
import type { Urgency } from "@/lib/constants";

export interface MatchInput {
  serviceId: string;
  latitude: number;
  longitude: number;
  date: Date;
  startTime: string;
  urgency: Urgency;
  excludeProviderIds?: string[];
}

export interface MatchCandidate {
  providerId: string;
  userId: string;
  businessName: string;
  providerName: string;
  avatar: string | null;
  area: string | null;
  rating: number;
  ratingCount: number;
  completedJobs: number;
  experienceYears: number;
  expertiseLevel: string;
  verified: boolean;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  providerPrice: number;
  estimatedPrice: number;
  matchScore: number;
  exactSlotFree: boolean;
  suggestedStartTime: string;
  suggestedEndTime: string;
  breakdown: {
    availability: number; distance: number; rating: number;
    price: number; expertise: number; workload: number;
  };
  weights: Record<string, number>;
  reasons: string[];
}

/**
 * The matching engine.
 *
 * Hard filters: active + approved provider, offers the service, works that day,
 * within service radius. Soft scoring: availability, distance, rating, price,
 * expertise and workload, weighted by the admin-configured matrix and boosted
 * for urgent jobs.
 */
export async function findMatches(input: MatchInput, limit = 8): Promise<MatchCandidate[]> {
  const [service, config] = await Promise.all([
    prisma.service.findUnique({ where: { id: input.serviceId } }),
    getMatchingConfig(),
  ]);
  if (!service || !service.active) return [];

  const offers = await prisma.providerService.findMany({
    where: {
      serviceId: input.serviceId,
      provider: {
        verificationStatus: "APPROVED",
        user: { accountStatus: "ACTIVE", deletedAt: null },
        ...(input.excludeProviderIds?.length ? { id: { notIn: input.excludeProviderIds } } : {}),
      },
    },
    include: { provider: { include: { user: true } } },
  });
  if (offers.length === 0) return [];

  const providerIds = offers.map((o) => o.providerId);
  const [calendars, activeCounts, todayCounts] = await Promise.all([
    loadCalendars(providerIds, input.date),
    prisma.booking.groupBy({
      by: ["providerId"],
      where: { providerId: { in: providerIds }, status: { in: ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"] } },
      _count: { _all: true },
    }),
    prisma.booking.groupBy({
      by: ["providerId"],
      where: { providerId: { in: providerIds }, scheduledDate: input.date, status: { notIn: ["CANCELLED", "REJECTED"] } },
      _count: { _all: true },
    }),
  ]);

  const activeMap = new Map(activeCounts.map((c) => [c.providerId, c._count._all]));
  const todayMap = new Map(todayCounts.map((c) => [c.providerId, c._count._all]));
  const weights = resolveWeights(config, input.urgency);
  const requestedEnd = endTimeFor(input.startTime, service.estimatedDuration);

  const candidates: MatchCandidate[] = [];

  for (const offer of offers) {
    const provider = offer.provider;
    const user = provider.user;
    if (user.latitude == null || user.longitude == null) continue;

    const distanceKm = haversineKm(input.latitude, input.longitude, user.latitude, user.longitude);
    if (distanceKm > provider.serviceRadiusKm) continue; // hard filter: outside service area

    const calendar = calendars.get(provider.id);
    if (!calendar?.window) continue; // hard filter: does not work that day

    const exactSlotFree = slotFreeInCalendar(calendar, input.startTime, requestedEnd);
    const alternative = exactSlotFree ? null : alternativeSlotInCalendar(calendar, service.estimatedDuration);
    if (!exactSlotFree && !alternative) continue; // hard filter: fully booked that day

    const acceptanceRate = provider.offeredCount > 0
      ? provider.acceptedCount / provider.offeredCount
      : 0.8;

    const scores = {
      availability: availabilityScore({
        exactSlotFree,
        sameDayAlternative: Boolean(alternative),
        dayAvailable: true,
      }),
      distance: distanceScore(distanceKm, provider.serviceRadiusKm),
      rating: ratingScore(provider.rating, provider.ratingCount),
      price: priceScore(offer.price, service.basePrice),
      expertise: (EXPERTISE_SCORE as Record<string, number>)[offer.expertiseLevel] ?? 0.65,
      workload: workloadScore({
        activeJobs: activeMap.get(provider.id) ?? 0,
        todayJobs: todayMap.get(provider.id) ?? 0,
        acceptanceRate,
      }),
    };

    const matchScore = computeMatchScore(scores, config, input.urgency);
    const eta = etaMinutes(distanceKm);
    const pricing = computePricing({
      providerPrice: offer.price,
      distanceKm,
      urgency: input.urgency,
      serviceFeePercent: config.serviceFeePercent,
      urgencyFeePercent: config.urgencyFeePercent,
      distanceFeePerKm: config.distanceFeePerKm,
    });

    candidates.push({
      providerId: provider.id,
      userId: user.id,
      businessName: provider.businessName,
      providerName: user.name,
      avatar: user.avatar,
      area: user.area,
      rating: provider.rating,
      ratingCount: provider.ratingCount,
      completedJobs: provider.completedJobs,
      experienceYears: offer.experienceYears,
      expertiseLevel: offer.expertiseLevel,
      verified: provider.verificationStatus === "APPROVED",
      distanceKm: Math.round(distanceKm * 10) / 10,
      estimatedArrivalMinutes: eta,
      providerPrice: offer.price,
      estimatedPrice: pricing.total,
      matchScore,
      exactSlotFree,
      suggestedStartTime: exactSlotFree ? input.startTime : alternative!.start,
      suggestedEndTime: exactSlotFree ? requestedEnd : alternative!.end,
      breakdown: scores,
      weights,
      reasons: matchReasons({
        exactSlotFree,
        distanceKm,
        rating: provider.rating,
        ratingCount: provider.ratingCount,
        completedJobs: provider.completedJobs,
        expertiseLevel: offer.expertiseLevel,
        serviceName: service.name,
        price: pricing.total,
        eta,
      }),
    });
  }

  candidates.sort(
    (a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm || a.estimatedPrice - b.estimatedPrice,
  );
  return candidates.slice(0, limit);
}

/** Persists the ranked shortlist so the customer, provider and admin all see the same numbers. */
export async function persistMatches(requestId: string, candidates: MatchCandidate[]) {
  await prisma.requestProviderMatch.deleteMany({ where: { requestId, declined: false } });
  if (candidates.length === 0) return;
  await prisma.requestProviderMatch.createMany({
    data: candidates.map((c, index) => ({
      requestId,
      providerId: c.providerId,
      rank: index + 1,
      matchScore: c.matchScore,
      distanceKm: c.distanceKm,
      distanceScore: c.breakdown.distance,
      availabilityScore: c.breakdown.availability,
      ratingScore: c.breakdown.rating,
      priceScore: c.breakdown.price,
      expertiseScore: c.breakdown.expertise,
      workloadScore: c.breakdown.workload,
      estimatedPrice: c.estimatedPrice,
      estimatedArrivalMinutes: c.estimatedArrivalMinutes,
      reason: JSON.stringify(c.reasons),
    })),
  });
  await prisma.providerProfile.updateMany({
    where: { id: { in: candidates.map((c) => c.providerId) } },
    data: { offeredCount: { increment: 1 } },
  });
}

export async function getStoredMatches(requestId: string) {
  return prisma.requestProviderMatch.findMany({
    where: { requestId },
    include: { provider: { include: { user: { select: { name: true, avatar: true, area: true } } } } },
    orderBy: { rank: "asc" },
  });
}
