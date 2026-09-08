import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { BOOKING_LABEL } from "@/lib/constants";
import { PageHeader, StatusBadge, EmptyState, Card, Avatar } from "@/components/ui";

export const metadata: Metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: { request: { include: { service: true } }, provider: { include: { user: { select: { phone: true } } } }, invoice: true },
    orderBy: [{ scheduledDate: "desc" }, { startTime: "desc" }],
  });

  return (
    <>
      <PageHeader title="Bookings" subtitle="Confirmed and past jobs" action={<Link href="/book" className="btn">Book a service</Link>} />
      {bookings.length === 0 ? (
        <Card><EmptyState icon="📅" title="Nothing booked yet" message="Once you choose a provider your booking appears here." action={<Link href="/book" className="btn">Book a service</Link>} /></Card>
      ) : (
        <div className="stack">
          {bookings.map((booking) => (
            <div key={booking.id} className="card">
              <div className="row-between">
                <div className="row" style={{ gap: 12 }}>
                  <Avatar name={booking.provider.businessName} />
                  <div>
                    <h3>{booking.request.service.name}</h3>
                    <p className="tiny muted">
                      {booking.provider.businessName} · {formatDate(booking.scheduledDate)} · {formatTime(booking.startTime)}–{formatTime(booking.endTime)}
                    </p>
                  </div>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <span className="strong mono small">{taka(booking.invoice?.total ?? booking.price)}</span>
                  <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <Link href={`/requests/${booking.requestId}`} className="btn btn-secondary btn-sm">Track</Link>
                {booking.invoice ? <Link href={`/invoices/${booking.invoice.id}`} className="btn btn-secondary btn-sm">Invoice</Link> : null}
                {booking.provider.user.phone ? <a href={`tel:${booking.provider.user.phone}`} className="btn btn-ghost btn-sm">Call provider</a> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
