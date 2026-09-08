import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { BOOKING_LABEL, BOOKING_STATUSES } from "@/lib/constants";
import { PageHeader, Card, StatusBadge, EmptyState } from "@/components/ui";
import { AdminBookingActions } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

const OPEN = ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULED"];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const bookings = await prisma.booking.findMany({
    where: params.status ? { status: params.status } : {},
    include: {
      request: { include: { service: true } },
      customer: { select: { name: true } },
      provider: { select: { businessName: true } },
      invoice: true,
    },
    orderBy: [{ scheduledDate: "desc" }, { startTime: "desc" }],
    take: 80,
  });

  return (
    <>
      <PageHeader title="Bookings" subtitle="Every job on the platform" />

      <Card style={{ marginBottom: 16 }}>
        <form className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <select name="status" className="select" defaultValue={params.status ?? ""} style={{ width: 180 }} aria-label="Filter by status">
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((status) => <option key={status} value={status}>{BOOKING_LABEL[status]}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary">Filter</button>
          <Link href="/admin/bookings" className="btn btn-ghost">Reset</Link>
        </form>
      </Card>

      {bookings.length === 0 ? (
        <Card><EmptyState icon="📅" title="No bookings match" /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Service</th><th>Customer</th><th>Provider</th><th>When</th><th>Value</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="small strong">{booking.request.service.name}</td>
                  <td className="small">{booking.customer.name}</td>
                  <td className="small">{booking.provider.businessName}</td>
                  <td className="tiny mono">{formatDate(booking.scheduledDate)} {formatTime(booking.startTime)}</td>
                  <td className="mono small">{taka(booking.invoice?.total ?? booking.price)}</td>
                  <td><StatusBadge status={booking.status} label={BOOKING_LABEL[booking.status]} /></td>
                  <td>
                    <AdminBookingActions
                      bookingId={booking.id}
                      invoiceId={booking.invoice && booking.invoice.paymentStatus !== "PAID" ? booking.invoice.id : undefined}
                      canCancel={OPEN.includes(booking.status)}
                    />
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
