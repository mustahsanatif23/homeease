import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listCustomerInvoices } from "@/services/invoice.service";
import { formatDate, taka } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const user = await requireRole("CUSTOMER");
  const invoices = await listCustomerInvoices(user.id);

  return (
    <>
      <PageHeader title="Invoices" subtitle="Every completed job is invoiced automatically" />
      {invoices.length === 0 ? (
        <Card><EmptyState icon="🧾" title="No invoices yet" message="Invoices appear as soon as a job is completed." /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Invoice</th><th>Service</th><th>Provider</th><th>Issued</th><th>Total</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.invoiceNumber}</td>
                  <td>{invoice.booking.request.service.name}</td>
                  <td>{invoice.booking.provider.businessName}</td>
                  <td>{formatDate(invoice.issuedAt)}</td>
                  <td className="mono strong">{taka(invoice.total)}</td>
                  <td><StatusBadge status={invoice.paymentStatus} /></td>
                  <td><Link href={`/invoices/${invoice.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
