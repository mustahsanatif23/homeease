import Link from "next/link";
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getRequestForCustomer } from "@/services/request.service";
import { cancelRequestAction } from "@/actions/customer.actions";
import { formatDate, formatTime, taka } from "@/lib/format";
import { REQUEST_LABEL, BOOKING_LABEL, URGENCY_LABEL, CUSTOMER_STATUS_MESSAGE } from "@/lib/constants";
import { Card, StatusBadge, Avatar, Stars, SectionHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import StatusTimeline from "@/components/StatusTimeline";
import ReviewForm from "@/components/ReviewForm";
import Poller from "@/components/Poller";
import { etaMinutes, haversineKm } from "@/lib/core.mjs";
import { prisma } from "@/lib/db";
import { getThread } from "@/services/message.service";
import Chat from "@/components/Chat";

export const metadata: Metadata = { title: "Track your request" };
export const dynamic = "force-dynamic";

export default async function RequestTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("CUSTOMER");
  const request = await getRequestForCustomer(id, user.id);
  const booking = request.bookings.find((b) => !["CANCELLED", "REJECTED"].includes(b.status)) ?? request.bookings[0];

  const providerUser = request.providerId
    ? await prisma.providerProfile.findUnique({
        where: { id: request.providerId },
        include: { user: { select: { latitude: true, longitude: true, name: true, phone: true, avatar: true, area: true } } },
      })
    : null;

  const distanceKm = providerUser?.user.latitude != null && providerUser.user.longitude != null
    ? Math.round(haversineKm(request.latitude, request.longitude, providerUser.user.latitude, providerUser.user.longitude) * 10) / 10
    : null;

  const live = booking ? ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"].includes(booking.status) : false;
  const thread = booking ? await getThread(booking.id, user.id, "CUSTOMER") : null;

  return (
    <>
      <Poller intervalMs={8000} enabled={live} />
      <BackButton fallback="/requests" label="Back to my requests" />
      <div className="page-head row-between" style={{ marginTop: 16 }}>
        <div>
          <h1>{request.service.name}</h1>
          <p className="muted small">
            {request.area} · {formatDate(request.preferredDate)} at {formatTime(request.preferredStartTime)} ·{" "}
            <span className="strong">{URGENCY_LABEL[request.urgency]}</span>
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <StatusBadge status={booking?.status ?? request.status} label={booking ? BOOKING_LABEL[booking.status] : REQUEST_LABEL[request.status]} />
          {!booking && ["PENDING", "MATCHED"].includes(request.status) ? (
            <Link href={`/requests/${request.id}/match`} className="btn btn-sm">Choose a provider</Link>
          ) : null}
        </div>
      </div>

      {booking ? (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          {CUSTOMER_STATUS_MESSAGE[booking.status]}
        </div>
      ) : null}

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Progress" subtitle="Live status of your job" />
          <StatusTimeline
            status={booking?.status ?? "REQUESTED"}
            createdAt={request.createdAt}
            acceptedAt={booking?.acceptedAt}
            startedAt={booking?.startedAt}
            completedAt={booking?.completedAt}
            etaMinutes={distanceKm != null ? etaMinutes(distanceKm) : undefined}
          />

          {booking && ["ACCEPTED", "ON_THE_WAY"].includes(booking.status) && distanceKm != null ? (
            <div className="card card-tight" style={{ marginTop: 14, background: "var(--surface-2)" }}>
              <div className="row-between">
                <div>
                  <div className="tiny muted">Live route (simulated)</div>
                  <div className="strong small">{providerUser?.user.area} → {request.area}</div>
                </div>
                <div className="center">
                  <div className="strong mono">{distanceKm} km</div>
                  <div className="tiny muted">{etaMinutes(distanceKm)} min</div>
                </div>
              </div>
              <div className="meter" style={{ marginTop: 10 }}>
                <span style={{ width: booking.status === "ON_THE_WAY" ? "62%" : "18%" }} />
              </div>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Map provider not configured — showing distance and arrival estimates from seeded coordinates.
              </p>
            </div>
          ) : null}
        </Card>

        <div className="stack">
          {request.provider ? (
            <Card>
              <SectionHeader title="Your provider" />
              <div className="row" style={{ gap: 12 }}>
                <Avatar name={request.provider.businessName} src={request.provider.user.avatar} size="lg" />
                <div>
                  <h3>{request.provider.businessName}</h3>
                  <p className="small muted">{request.provider.user.name} · {request.provider.user.area}</p>
                  <Stars rating={request.provider.rating} count={request.provider.ratingCount} />
                  <p className="small" style={{ marginTop: 6 }}>📞 {request.provider.user.phone ?? "—"}</p>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <Link href={`/providers/${request.provider.id}`} className="btn btn-secondary btn-sm">View profile</Link>
              </div>
            </Card>
          ) : null}

          {booking && thread ? (
            <Card>
              <SectionHeader title="Messages" subtitle="Talk to your provider in real time" />
              <Chat
                bookingId={booking.id}
                initialMessages={thread.messages}
                counterpart={thread.counterpart}
                closed={thread.closed}
              />
              <Link href={`/messages/${booking.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                Open full conversation
              </Link>
            </Card>
          ) : null}

          <Card>
            <SectionHeader title="Request details" />
            <ul className="stack-sm small">
              <li className="row-between"><span className="muted">Address</span><span className="strong" style={{ textAlign: "right" }}>{request.address}</span></li>
              <li className="row-between"><span className="muted">Contact</span><span className="strong">{request.contactPhone}</span></li>
              <li className="row-between"><span className="muted">Scheduled</span><span className="strong">{booking ? `${formatDate(booking.scheduledDate)} ${formatTime(booking.startTime)}` : formatDate(request.preferredDate)}</span></li>
              <li className="row-between"><span className="muted">Match score</span><span className="strong mono">{request.matchScore ? `${Math.round(request.matchScore)}%` : "—"}</span></li>
              <li className="row-between"><span className="muted">{request.finalPrice ? "Final price" : "Estimated price"}</span><span className="strong mono">{taka(request.finalPrice ?? booking?.price ?? request.estimatedPrice)}</span></li>
            </ul>
            <p className="small muted" style={{ marginTop: 12 }}>{request.description}</p>
            {request.imageUrl ? (
              <img src={request.imageUrl} alt="Problem photo" style={{ marginTop: 12, width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
            ) : null}
            {booking && ["REQUESTED", "ACCEPTED"].includes(booking.status) ? (
              <div style={{ marginTop: 14 }}>
                <ConfirmButton
                  action={cancelRequestAction.bind(null, request.id)}
                  className="btn-secondary btn-sm"
                  confirmText="Cancel this request? The provider will be notified."
                >
                  Cancel request
                </ConfirmButton>
              </div>
            ) : null}
          </Card>

          {booking?.invoice ? (
            <Card>
              <SectionHeader title="Invoice" subtitle={booking.invoice.invoiceNumber} />
              <div className="row-between">
                <span className="strong mono" style={{ fontSize: "1.2rem" }}>{taka(booking.invoice.total)}</span>
                <StatusBadge status={booking.invoice.paymentStatus} />
              </div>
              <Link href={`/invoices/${booking.invoice.id}`} className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>View invoice</Link>
            </Card>
          ) : null}

          {booking?.status === "COMPLETED" && !booking.review ? (
            <Card>
              <SectionHeader title="How did it go?" subtitle="Your rating updates the provider's score" />
              <ReviewForm bookingId={booking.id} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
