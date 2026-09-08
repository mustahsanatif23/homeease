import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getCustomerDashboard } from "@/services/analytics.service";
import { popularServices } from "@/services/catalog.service";
import { taka, formatDate, formatTime } from "@/lib/format";
import { StatCard, Card, EmptyState, SectionHeader, StatusBadge, Avatar, Stars } from "@/components/ui";
import Poller from "@/components/Poller";
import { REQUEST_LABEL, BOOKING_LABEL } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function CustomerDashboard() {
  const user = await requireRole("CUSTOMER");
  const [data, services] = await Promise.all([getCustomerDashboard(user.id), popularServices(6)]);

  return (
    <>
      <Poller intervalMs={12000} enabled={data.activeRequests.length > 0 || data.upcoming.length > 0} />

      <div className="page-head row-between">
        <div>
          <h1>{greeting()}, {user.name.split(" ")[0]} 👋</h1>
          <p className="muted small">Here&apos;s what&apos;s happening with your services.</p>
        </div>
        <Link href="/book" className="btn btn-lg">Book a service</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Active requests" value={data.activeRequests.length} />
        <StatCard label="Upcoming" value={data.upcoming.length} />
        <StatCard label="Completed" value={data.completed} />
        <StatCard label="Total spent" value={taka(data.totalSpent)} />
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Active request" subtitle="Live status of what you've asked for" action={<Link href="/requests" className="btn btn-ghost btn-sm">View all</Link>} />
          {data.activeRequests.length === 0 ? (
            <EmptyState icon="🧰" title="No service requests yet." message="Book your first service and we'll match you with a provider." action={<Link href="/book" className="btn">Book a service</Link>} />
          ) : (
            <ul className="stack">
              {data.activeRequests.slice(0, 3).map((request) => (
                <li key={request.id}>
                  <Link href={`/requests/${request.id}`} className="card card-tight card-hover" style={{ display: "block" }}>
                    <div className="row-between">
                      <div>
                        <h3>{request.service.name}</h3>
                        <p className="tiny muted">{request.area} · {formatDate(request.preferredDate)} · {formatTime(request.preferredStartTime)}</p>
                      </div>
                      <StatusBadge status={request.status} label={REQUEST_LABEL[request.status]} />
                    </div>
                    {request.provider ? <p className="small muted" style={{ marginTop: 8 }}>Provider: {request.provider.businessName}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Upcoming booking" subtitle="Confirmed jobs on your calendar" action={<Link href="/bookings" className="btn btn-ghost btn-sm">All bookings</Link>} />
          {data.upcoming.length === 0 ? (
            <EmptyState icon="📅" title="Nothing scheduled" message="Confirmed bookings will show up here." />
          ) : (
            <ul className="stack">
              {data.upcoming.map((booking) => (
                <li key={booking.id} className="card card-tight">
                  <div className="row-between">
                    <div className="row" style={{ gap: 10 }}>
                      <Avatar name={booking.provider.businessName} size="sm" />
                      <div>
                        <h3>{booking.request.service.name}</h3>
                        <p className="tiny muted">{booking.provider.businessName} · {formatDate(booking.scheduledDate)} at {formatTime(booking.startTime)}</p>
                      </div>
                    </div>
                    <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <Link href={`/requests/${booking.requestId}`} className="btn btn-secondary btn-sm">Track</Link>
                    <span className="small muted mono">{taka(booking.price)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionHeader title="Popular services" subtitle="Book in a couple of taps" action={<Link href="/services" className="btn btn-ghost btn-sm">Browse all</Link>} />
        <div className="grid grid-3">
          {services.map((service) => (
            <Link key={service.id} href={`/book?service=${service.id}`} className="card card-hover">
              <div className="row" style={{ gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }} aria-hidden="true">{service.category.icon}</span>
                <div><h3>{service.name}</h3><p className="tiny muted">{service.category.name}</p></div>
              </div>
              <div className="row-between" style={{ marginTop: 10 }}>
                <span className="strong">{taka(service.basePrice)}</span>
                <span className="tiny muted">from</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20, alignItems: "start" }}>
        <Card>
          <SectionHeader title="Recent services" action={<Link href="/history" className="btn btn-ghost btn-sm">History</Link>} />
          {data.recent.length === 0 ? (
            <EmptyState icon="🕘" title="Nothing here yet" message="Completed jobs will appear here." />
          ) : (
            <ul className="stack-sm">
              {data.recent.map((booking) => (
                <li key={booking.id} className="row-between card card-tight">
                  <div>
                    <div className="strong small">{booking.request.service.name}</div>
                    <div className="tiny muted">{formatDate(booking.completedAt ?? booking.scheduledDate)} · {booking.provider.businessName}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="small mono">{taka(booking.invoice?.total ?? booking.price)}</span>
                    <Link href={`/book?service=${booking.request.serviceId}`} className="btn btn-secondary btn-sm">Book again</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Favourite providers" action={<Link href="/favorites" className="btn btn-ghost btn-sm">Manage</Link>} />
          {data.favorites.length === 0 ? (
            <EmptyState icon="⭐" title="No favourite providers yet." message="Save trusted providers for faster booking." />
          ) : (
            <ul className="stack-sm">
              {data.favorites.map((favorite) => (
                <li key={favorite.id} className="row-between card card-tight">
                  <div className="row" style={{ gap: 10 }}>
                    <Avatar name={favorite.provider.businessName} size="sm" />
                    <div>
                      <div className="strong small">{favorite.provider.businessName}</div>
                      <div className="tiny muted">{favorite.provider.user.area}</div>
                    </div>
                  </div>
                  <Stars rating={favorite.provider.rating} count={favorite.provider.ratingCount} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
