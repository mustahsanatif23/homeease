import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getProviderDashboard } from "@/services/provider.service";
import { formatDate, formatTime, taka } from "@/lib/format";
import { BOOKING_LABEL, URGENCY_LABEL } from "@/lib/constants";
import { StatCard, Card, EmptyState, SectionHeader, StatusBadge, Stars } from "@/components/ui";
import JobActions from "@/components/JobActions";
import Poller from "@/components/Poller";
import { haversineKm } from "@/lib/core.mjs";

export const metadata: Metadata = { title: "Provider dashboard" };
export const dynamic = "force-dynamic";

export default async function ProviderDashboard() {
  const user = await requireRole("PROVIDER");
  const { profile, incoming, todayJobs, upcoming, completedCount, reviews } = await getProviderDashboard(user.providerId!);

  return (
    <>
      <Poller intervalMs={10000} />
      <div className="page-head row-between">
        <div>
          <h1>{profile.businessName}</h1>
          <p className="muted small">Here&apos;s your day at a glance.</p>
        </div>
        <Link href="/provider/calendar" className="btn btn-secondary">Manage availability</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Today's jobs" value={todayJobs.length} />
        <StatCard label="Incoming requests" value={incoming.length} />
        <StatCard label="Completed" value={completedCount} />
        <StatCard label="Earnings" value={taka(profile.totalEarnings)} hint={`${profile.rating > 0 ? profile.rating.toFixed(1) : "—"}★ from ${profile.ratingCount} reviews`} />
      </div>

      <Card className="" >
        <SectionHeader title="Incoming requests" subtitle="Accept quickly — customers see your response time" action={<Link href="/provider/requests" className="btn btn-ghost btn-sm">View all</Link>} />
        {incoming.length === 0 ? (
          <EmptyState icon="📥" title="Nothing waiting" message="New job requests matched to you will appear here." />
        ) : (
          <div className="stack">
            {incoming.slice(0, 5).map((booking) => {
              const distance = user.latitude != null && user.longitude != null
                ? Math.round(haversineKm(user.latitude, user.longitude, booking.request.latitude, booking.request.longitude) * 10) / 10
                : null;
              return (
                <div key={booking.id} className="card card-tight">
                  <div className="row-between">
                    <div>
                      <div className="row" style={{ gap: 8 }}>
                        <h3>{booking.request.service.name}</h3>
                        {booking.request.urgency !== "NORMAL" ? <StatusBadge status={booking.request.urgency} label={URGENCY_LABEL[booking.request.urgency]} /> : null}
                      </div>
                      <p className="tiny muted">
                        {booking.customer.name} · {booking.request.area} · {formatDate(booking.scheduledDate)} at {formatTime(booking.startTime)}
                        {distance != null ? ` · ${distance} km away` : ""}
                      </p>
                    </div>
                    <span className="strong mono">{taka(booking.price)}</span>
                  </div>
                  <p className="small muted" style={{ margin: "8px 0" }}>{booking.request.description}</p>
                  <div className="row-between">
                    <JobActions bookingId={booking.id} status={booking.status} size="sm" />
                    <Link href={`/provider/requests/${booking.id}`} className="btn btn-ghost btn-sm">View details</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start", marginTop: 20 }}>
        <Card>
          <SectionHeader title="Today's schedule" />
          {todayJobs.length === 0 ? (
            <EmptyState icon="🗓️" title="No jobs today" message="Enjoy the quiet — or widen your availability." />
          ) : (
            <ul className="stack-sm">
              {todayJobs.map((booking) => (
                <li key={booking.id} className="card card-tight">
                  <div className="row-between">
                    <div>
                      <div className="strong small">{booking.request.service.name}</div>
                      <div className="tiny muted">{formatTime(booking.startTime)}–{formatTime(booking.endTime)} · {booking.customer.name}</div>
                      <div className="tiny muted">{booking.request.address}</div>
                    </div>
                    <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
                  </div>
                  <div style={{ marginTop: 10 }}><JobActions bookingId={booking.id} status={booking.status} size="sm" /></div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Upcoming jobs" action={<Link href="/provider/bookings" className="btn btn-ghost btn-sm">All jobs</Link>} />
            {upcoming.length === 0 ? (
              <EmptyState icon="📅" title="Nothing scheduled yet" />
            ) : (
              <ul className="stack-sm small">
                {upcoming.map((booking) => (
                  <li key={booking.id} className="row-between">
                    <span>{booking.request.service.name} · <span className="muted">{booking.customer.name}</span></span>
                    <span className="muted mono">{formatDate(booking.scheduledDate)} {formatTime(booking.startTime)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader title="Recent reviews" action={<Link href="/provider/reviews" className="btn btn-ghost btn-sm">All reviews</Link>} />
            {reviews.length === 0 ? (
              <EmptyState icon="⭐" title="No reviews yet" message="Complete jobs to start building your rating." />
            ) : (
              <ul className="stack-sm">
                {reviews.map((review) => (
                  <li key={review.id} className="card card-tight">
                    <div className="row-between"><Stars rating={review.rating} /><span className="tiny muted">{review.customer.name}</span></div>
                    {review.comment ? <p className="small muted" style={{ marginTop: 6 }}>{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
