import Link from "next/link";
import BackButton from "@/components/BackButton";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getBookingForUser } from "@/services/booking.service";
import { formatDate, formatTime, taka } from "@/lib/format";
import { BOOKING_LABEL, URGENCY_LABEL } from "@/lib/constants";
import { Card, StatusBadge, SectionHeader, Avatar } from "@/components/ui";
import JobActions from "@/components/JobActions";
import StatusTimeline from "@/components/StatusTimeline";
import { haversineKm, etaMinutes } from "@/lib/core.mjs";
import { getThread } from "@/services/message.service";
import Chat from "@/components/Chat";

export const metadata: Metadata = { title: "Job details" };
export const dynamic = "force-dynamic";

export default async function ProviderJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("PROVIDER");
  const booking = await getBookingForUser(id, user.id, "PROVIDER");

  const thread = await getThread(booking.id, user.id, "PROVIDER");

  const distance = user.latitude != null && user.longitude != null
    ? Math.round(haversineKm(user.latitude, user.longitude, booking.request.latitude, booking.request.longitude) * 10) / 10
    : null;

  return (
    <>
      <BackButton fallback="/provider/requests" label="Back to jobs" />
      <div className="page-head row-between" style={{ marginTop: 16 }}>
        <div>
          <h1>{booking.request.service.name}</h1>
          <p className="muted small">
            {formatDate(booking.scheduledDate)} · {formatTime(booking.startTime)}–{formatTime(booking.endTime)} ·{" "}
            <span className="strong">{URGENCY_LABEL[booking.request.urgency]}</span>
          </p>
        </div>
        <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Job progress" />
          <StatusTimeline
            status={booking.status}
            createdAt={booking.createdAt}
            acceptedAt={booking.acceptedAt}
            startedAt={booking.startedAt}
            completedAt={booking.completedAt}
            etaMinutes={distance != null ? etaMinutes(distance) : undefined}
          />
          <div style={{ marginTop: 16 }}><JobActions bookingId={booking.id} status={booking.status} /></div>
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Customer" />
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={booking.customer.name} src={booking.customer.avatar} />
              <div>
                <div className="strong">{booking.customer.name}</div>
                <div className="small muted">{booking.request.contactPhone}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <a href={`tel:${booking.request.contactPhone}`} className="btn btn-secondary btn-sm">Call customer</a>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Messages" subtitle="Reply to the customer in real time" />
            <Chat
              bookingId={booking.id}
              initialMessages={thread.messages}
              counterpart={thread.counterpart}
              closed={thread.closed}
            />
            <Link href={`/provider/messages/${booking.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
              Open full conversation
            </Link>
          </Card>

          <Card>
            <SectionHeader title="Job details" />
            <ul className="stack-sm small">
              <li className="row-between"><span className="muted">Address</span><span className="strong" style={{ textAlign: "right" }}>{booking.request.address}</span></li>
              <li className="row-between"><span className="muted">Area</span><span className="strong">{booking.request.area}</span></li>
              {distance != null ? <li className="row-between"><span className="muted">Distance</span><span className="strong mono">{distance} km · ~{etaMinutes(distance)} min</span></li> : null}
              <li className="row-between"><span className="muted">Job value</span><span className="strong mono">{taka(booking.price)}</span></li>
            </ul>
            <p className="small muted" style={{ marginTop: 12 }}>{booking.request.description}</p>
            {booking.request.imageUrl ? (
              <img src={booking.request.imageUrl} alt="Problem photo" style={{ marginTop: 12, width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
            ) : null}
          </Card>

          {booking.invoice ? (
            <Card>
              <SectionHeader title="Invoice" subtitle={booking.invoice.invoiceNumber} />
              <div className="row-between">
                <span className="strong mono">{taka(booking.invoice.total)}</span>
                <StatusBadge status={booking.invoice.paymentStatus} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/provider/requests" className="btn btn-ghost btn-sm">← Back to incoming jobs</Link>
      </div>
    </>
  );
}
