import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatTime, taka } from "@/lib/format";
import { REQUEST_LABEL, URGENCY_LABEL, REQUEST_STATUSES } from "@/lib/constants";
import { PageHeader, Card, StatusBadge, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const requests = await prisma.serviceRequest.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { OR: [{ title: { contains: params.q } }, { area: { contains: params.q } }] } : {}),
    },
    include: {
      service: true,
      customer: { select: { name: true } },
      provider: { select: { businessName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <>
      <PageHeader title="Service requests" subtitle={`${requests.length} shown`} />

      <Card style={{ marginBottom: 16 }}>
        <form className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <input name="q" className="input" defaultValue={params.q} placeholder="Search title or area" style={{ maxWidth: 260 }} aria-label="Search requests" />
          <select name="status" className="select" defaultValue={params.status ?? ""} style={{ width: 170 }} aria-label="Filter by status">
            <option value="">All statuses</option>
            {REQUEST_STATUSES.map((status) => <option key={status} value={status}>{REQUEST_LABEL[status]}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary">Filter</button>
          <Link href="/admin/requests" className="btn btn-ghost">Reset</Link>
        </form>
      </Card>

      {requests.length === 0 ? (
        <Card><EmptyState icon="📋" title="No requests match" /></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Request</th><th>Customer</th><th>Provider</th><th>Scheduled</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div className="small strong">{request.service.name}</div>
                    <div className="tiny muted">
                      {request.area} · {URGENCY_LABEL[request.urgency]}
                      {request.matchScore ? ` · match ${Math.round(request.matchScore)}%` : ""}
                    </div>
                  </td>
                  <td className="small">{request.customer.name}</td>
                  <td className="small">{request.provider?.businessName ?? <span className="muted">unassigned</span>}</td>
                  <td className="tiny mono">{formatDate(request.preferredDate)} {formatTime(request.preferredStartTime)}</td>
                  <td className="mono small">{taka(request.finalPrice ?? request.estimatedPrice)}</td>
                  <td><StatusBadge status={request.status} label={REQUEST_LABEL[request.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
