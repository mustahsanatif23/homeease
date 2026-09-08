import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getProviderEarnings } from "@/services/provider.service";
import { formatDate, taka } from "@/lib/format";
import { PageHeader, Card, StatCard, EmptyState, SectionHeader, StatusBadge } from "@/components/ui";
import { BarChart } from "@/components/Charts";

export const metadata: Metadata = { title: "Earnings" };
export const dynamic = "force-dynamic";

export default async function ProviderEarningsPage() {
  const user = await requireRole("PROVIDER");
  const { completed, total, paid, pending, monthly } = await getProviderEarnings(user.providerId!);

  return (
    <>
      <PageHeader title="Earnings" subtitle="Every completed job, invoiced automatically" />
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total earned" value={taka(total)} />
        <StatCard label="Paid out" value={taka(paid)} />
        <StatCard label="Awaiting payment" value={taka(pending)} />
        <StatCard label="Jobs completed" value={completed.length} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <SectionHeader title="Monthly earnings" subtitle="Based on issued invoices" />
        {monthly.length === 0 ? (
          <EmptyState icon="📈" title="No earnings yet" />
        ) : (
          <BarChart data={monthly.map((m) => ({ label: m.month.slice(5), value: m.amount }))} height={200} />
        )}
      </Card>

      <Card>
        <SectionHeader title="Completed jobs" />
        {completed.length === 0 ? (
          <EmptyState icon="🧾" title="Nothing completed yet" message="Finish your first job to start earning." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Service</th><th>Invoice</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {completed.map((booking) => (
                  <tr key={booking.id}>
                    <td className="small">{formatDate(booking.completedAt ?? booking.scheduledDate)}</td>
                    <td>{booking.request.service.name}</td>
                    <td className="mono small">{booking.invoice?.invoiceNumber ?? "—"}</td>
                    <td className="mono strong">{taka(booking.invoice?.total ?? booking.price)}</td>
                    <td>{booking.invoice ? <StatusBadge status={booking.invoice.paymentStatus} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
