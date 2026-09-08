import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, taka } from "@/lib/format";
import { BOOKING_LABEL } from "@/lib/constants";
import { PageHeader, StatusBadge, EmptyState, Card, Stars, SectionHeader } from "@/components/ui";
import ReviewForm from "@/components/ReviewForm";

export const metadata: Metadata = { title: "Service history" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id },
    include: { request: { include: { service: true } }, provider: true, invoice: true, review: true },
    orderBy: [{ scheduledDate: "desc" }],
  });

  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const upcoming = bookings.filter((b) => ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULED"].includes(b.status));
  const cancelled = bookings.filter((b) => ["CANCELLED", "REJECTED"].includes(b.status));

  const groups = [
    { title: "Upcoming", items: upcoming },
    { title: "Completed", items: completed },
    { title: "Cancelled", items: cancelled },
  ];

  return (
    <>
      <PageHeader title="Service history" subtitle="Everything you've booked on HomeEase" />
      {bookings.length === 0 ? (
        <Card><EmptyState icon="🕘" title="Nothing here yet" message="Your completed services will be listed here." action={<Link href="/book" className="btn">Book a service</Link>} /></Card>
      ) : (
        <div className="stack">
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <section key={group.title}>
                <SectionHeader title={group.title} subtitle={`${group.items.length} job${group.items.length === 1 ? "" : "s"}`} />
                <div className="stack">
                  {group.items.map((booking) => (
                    <div key={booking.id} className="card">
                      <div className="row-between">
                        <div>
                          <h3>{booking.request.service.name}</h3>
                          <p className="tiny muted">{booking.provider.businessName} · {formatDate(booking.scheduledDate)}</p>
                        </div>
                        <div className="row" style={{ gap: 12 }}>
                          <span className="strong mono small">{taka(booking.invoice?.total ?? booking.price)}</span>
                          <StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} />
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <Link href={`/requests/${booking.requestId}`} className="btn btn-secondary btn-sm">Details</Link>
                        {booking.invoice ? <Link href={`/invoices/${booking.invoice.id}`} className="btn btn-secondary btn-sm">Invoice</Link> : null}
                        <Link href={`/book?service=${booking.request.serviceId}`} className="btn btn-sm">Book again</Link>
                        {booking.review ? <Stars rating={booking.review.rating} /> : null}
                      </div>
                      {booking.status === "COMPLETED" && !booking.review ? (
                        <details style={{ marginTop: 12 }}>
                          <summary className="small strong" style={{ cursor: "pointer" }}>Rate this service</summary>
                          <div style={{ marginTop: 12 }}><ReviewForm bookingId={booking.id} /></div>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </>
  );
}
