import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { URGENCY_LABEL } from "@/lib/constants";
import { PageHeader, Card, EmptyState, StatusBadge } from "@/components/ui";
import JobActions from "@/components/JobActions";
import Poller from "@/components/Poller";
import { haversineKm, etaMinutes } from "@/lib/core.mjs";

export const metadata: Metadata = { title: "Incoming jobs" };
export const dynamic = "force-dynamic";

export default async function ProviderRequestsPage() {
  const user = await requireRole("PROVIDER");
  const bookings = await prisma.booking.findMany({
    where: { providerId: user.providerId!, status: "REQUESTED" },
    include: { request: { include: { service: true } }, customer: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Poller intervalMs={10000} />
      <PageHeader title="Incoming jobs" subtitle="Requests matched to your skills, area and availability" />
      {bookings.length === 0 ? (
        <Card><EmptyState icon="📥" title="Nothing waiting" message="You'll see new requests here the moment HomeEase matches you." /></Card>
      ) : (
        <div className="stack">
          {bookings.map((booking) => {
            const distance = user.latitude != null && user.longitude != null
              ? Math.round(haversineKm(user.latitude, user.longitude, booking.request.latitude, booking.request.longitude) * 10) / 10
              : null;
            return (
              <Card key={booking.id}>
                <div className="row-between">
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <h3>{booking.request.service.name}</h3>
                      {booking.request.urgency !== "NORMAL" ? <StatusBadge status={booking.request.urgency} label={URGENCY_LABEL[booking.request.urgency]} /> : null}
                    </div>
                    <p className="tiny muted">
                      {booking.customer.name} · {booking.request.address}, {booking.request.area}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="strong mono">{taka(booking.price)}</div>
                    <div className="tiny muted">{formatDate(booking.scheduledDate)} · {formatTime(booking.startTime)}</div>
                    {distance != null ? <div className="tiny muted">{distance} km · ~{etaMinutes(distance)} min</div> : null}
                  </div>
                </div>
                <p className="small muted" style={{ margin: "10px 0" }}>{booking.request.description}</p>
                {booking.request.imageUrl ? (
                  <img src={booking.request.imageUrl} alt="Problem photo" style={{ maxWidth: 200, borderRadius: 10, border: "1px solid var(--border)", marginBottom: 10 }} />
                ) : null}
                <div className="row-between">
                  <JobActions bookingId={booking.id} status={booking.status} size="sm" />
                  <Link href={`/provider/requests/${booking.id}`} className="btn btn-ghost btn-sm">Details</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
