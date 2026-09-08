import Link from "next/link";
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getRequestForCustomer } from "@/services/request.service";
import { findMatches } from "@/services/matching.service";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { URGENCY_LABEL } from "@/lib/constants";
import MatchResults, { type MatchView } from "./MatchResults";

export const metadata: Metadata = { title: "Choose your provider" };
export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("CUSTOMER");
  const request = await getRequestForCustomer(id, user.id);

  // A booking already exists — send the customer to tracking instead.
  if (request.bookings.some((b) => !["CANCELLED", "REJECTED"].includes(b.status))) {
    return (
      <div className="card">
        <h1>This request is already booked</h1>
        <p className="muted small" style={{ margin: "8px 0 16px" }}>Follow the job from your tracking page.</p>
        <Link href={`/requests/${request.id}`} className="btn">Track this request</Link>
      </div>
    );
  }

  const declined = await prisma.requestProviderMatch.findMany({
    where: { requestId: request.id, declined: true },
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

  const matches: MatchView[] = candidates.map((c, index) => ({
    providerId: c.providerId,
    businessName: c.businessName,
    providerName: c.providerName,
    area: c.area,
    rank: index + 1,
    matchScore: c.matchScore,
    distanceKm: c.distanceKm,
    eta: c.estimatedArrivalMinutes,
    price: c.estimatedPrice,
    rating: c.rating,
    ratingCount: c.ratingCount,
    completedJobs: c.completedJobs,
    experienceYears: c.experienceYears,
    expertiseLevel: c.expertiseLevel,
    verified: c.verified,
    exactSlotFree: c.exactSlotFree,
    suggestedStartTime: c.suggestedStartTime,
    reasons: c.reasons,
    breakdown: c.breakdown,
    weights: c.weights,
  }));

  return (
    <>
      <BackButton fallback="/requests" />
      <div className="page-head" style={{ marginTop: 16 }}>
        <h1>Your best matches</h1>
        <p className="muted small">
          {request.service.name} · {request.area} · {formatDate(request.preferredDate)} at {formatTime(request.preferredStartTime)}
          {" · "}<span className="strong">{URGENCY_LABEL[request.urgency]}</span>
          {" · from "}{taka(request.service.basePrice)}
        </p>
      </div>
      <MatchResults requestId={request.id} matches={matches} requestedTime={formatTime(request.preferredStartTime)} />
    </>
  );
}
