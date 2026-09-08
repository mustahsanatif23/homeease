import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { BOOKING_LABEL } from "@/lib/constants";
import { PageHeader, Card, EmptyState, StatusBadge } from "@/components/ui";
import JobActions from "@/components/JobActions";

export const metadata: Metadata = { title: "My jobs" };
export const dynamic = "force-dynamic";

export default async function ProviderBookingsPage() {
  const user = await requireRole("PROVIDER");
  const bookings = await prisma.booking.findMany({
    where: { providerId: user.providerId! },
    include: { request: { include: { service: true } }, customer: { select: { name: true } }, invoice: true },
    orderBy: [{ scheduledDate: "desc" }, { startTime: "desc" }],
    take: 60,
  });

  return (
    <>
      <PageHeader title="My jobs" subtitle="Everything assigned to you, newest first" />
      {bookings.length === 0 ? (
        <Card><EmptyState icon="📅" title="No jobs yet" message="Accepted requests will show up here." /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Service</th><th>Customer</th><th>When</th><th>Value</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="strong">{booking.request.service.name}</td>
                  <td>{booking.customer.name}</td>
                  <td className="mono small">{formatDate(booking.scheduledDate)} {formatTime(booking.startTime)}</td>
                  <td className="mono">{taka(booking.invoice?.total ?? booking.price)}</td>
                  <td><StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} /></td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <JobActions bookingId={booking.id} status={booking.status} size="sm" />
                      <Link href={`/provider/requests/${booking.id}`} className="btn btn-ghost btn-sm">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
