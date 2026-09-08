import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, taka } from "@/lib/format";
import { PageHeader, Card, StatCard, StatusBadge, EmptyState } from "@/components/ui";
import { AdminBookingActions } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function AdminInvoicesPage() {
  await requireRole("ADMIN");
  const [invoices, totals] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        booking: {
          include: {
            request: { include: { service: true } },
            customer: { select: { name: true } },
            provider: { select: { businessName: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
      take: 80,
    }),
    prisma.invoice.groupBy({ by: ["paymentStatus"], _sum: { total: true }, _count: { _all: true } }),
  ]);

  const sumFor = (status: string) => totals.find((t) => t.paymentStatus === status)?._sum.total ?? 0;

  return (
    <>
      <PageHeader title="Invoices" subtitle="Generated automatically when a job completes" />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label="Paid" value={taka(sumFor("PAID"))} />
        <StatCard label="Unpaid" value={taka(sumFor("UNPAID"))} />
        <StatCard label="Refunded" value={taka(sumFor("REFUNDED"))} />
      </div>

      {invoices.length === 0 ? (
        <Card><EmptyState icon="🧾" title="No invoices yet" /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Service</th><th>Customer</th><th>Provider</th><th>Issued</th><th>Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono small">{invoice.invoiceNumber}</td>
                  <td className="small">{invoice.booking.request.service.name}</td>
                  <td className="small">{invoice.booking.customer.name}</td>
                  <td className="small">{invoice.booking.provider.businessName}</td>
                  <td className="tiny muted">{formatDate(invoice.issuedAt)}</td>
                  <td className="mono strong">{taka(invoice.total)}</td>
                  <td><StatusBadge status={invoice.paymentStatus} /></td>
                  <td>
                    <AdminBookingActions
                      bookingId={invoice.bookingId}
                      invoiceId={invoice.paymentStatus === "PAID" ? undefined : invoice.id}
                      canCancel={false}
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
