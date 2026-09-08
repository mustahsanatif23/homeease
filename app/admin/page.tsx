import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  getAdminOverview, getRequestsSeries, getRevenueSeries, getCategoryBreakdown, getTopProviders,
} from "@/services/analytics.service";
import { prisma } from "@/lib/db";
import { taka, timeAgo, formatDate } from "@/lib/format";
import { PageHeader, StatCard, Card, SectionHeader, EmptyState, StatusBadge } from "@/components/ui";
import { LineChart, BarChart } from "@/components/Charts";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireRole("ADMIN");
  const [overview, requestsSeries, revenueSeries, categories, topProviders, recentAudit, pendingProviders] = await Promise.all([
    getAdminOverview("30d"),
    getRequestsSeries("30d"),
    getRevenueSeries("30d"),
    getCategoryBreakdown(),
    getTopProviders(5),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }),
    prisma.providerProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: { user: { select: { name: true, email: true, area: true, createdAt: true } } },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Last 30 days" action={<Link href="/admin/analytics" className="btn btn-secondary">Full analytics</Link>} />

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Total users" value={overview.totalUsers} hint={`${overview.customers} customers · ${overview.providers} providers`} />
        <StatCard label="Active requests" value={overview.activeRequests} hint={`${overview.urgentCount} urgent`} />
        <StatCard label="Completed jobs" value={overview.completedJobs} hint={`${overview.cancellationRate}% cancelled`} />
        <StatCard label="Revenue" value={taka(overview.revenue)} hint={`avg rating ${overview.averageRating || "—"}★`} />
      </div>

      {overview.pendingProviders > 0 ? (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          <strong>{overview.pendingProviders}</strong> provider{overview.pendingProviders === 1 ? "" : "s"} waiting for verification.{" "}
          <Link href="/admin/providers?status=PENDING" className="strong">Review now →</Link>
        </div>
      ) : null}

      <div className="grid grid-2" style={{ marginBottom: 16, alignItems: "start" }}>
        <Card>
          <SectionHeader title="Requests per day" subtitle="Demand trend" />
          <LineChart data={requestsSeries} />
        </Card>
        <Card>
          <SectionHeader title="Revenue" subtitle="Invoiced totals" />
          {revenueSeries.length === 0 ? <EmptyState icon="📈" title="No invoices in this range" /> : <BarChart data={revenueSeries} />}
        </Card>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="stack">
          <Card>
            <SectionHeader title="Pending verifications" action={<Link href="/admin/providers" className="btn btn-ghost btn-sm">All providers</Link>} />
            {pendingProviders.length === 0 ? (
              <EmptyState icon="✅" title="Nothing to review" message="Every provider application has been handled." />
            ) : (
              <ul className="stack-sm">
                {pendingProviders.map((provider) => (
                  <li key={provider.id} className="row-between">
                    <div>
                      <div className="small strong">{provider.businessName}</div>
                      <div className="tiny muted">{provider.user.name} · {provider.user.area} · applied {formatDate(provider.user.createdAt)}</div>
                    </div>
                    <Link href={`/admin/providers?status=PENDING`} className="btn btn-secondary btn-sm">Review</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader title="Requests by category" />
            {categories.length === 0 ? <EmptyState icon="🗂️" title="No data yet" /> : <BarChart data={categories.slice(0, 6)} height={190} />}
          </Card>
        </div>

        <div className="stack">
          <Card>
            <SectionHeader title="Top providers" subtitle="By completed jobs" />
            <ul className="stack-sm small">
              {topProviders.map((provider) => (
                <li key={provider.id} className="row-between">
                  <span>{provider.businessName} <span className="muted">· {provider.user.area}</span></span>
                  <span className="mono">{provider.completedJobs} jobs · {provider.rating > 0 ? provider.rating.toFixed(1) : "—"}★</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Recent activity" action={<Link href="/admin/audit-logs" className="btn btn-ghost btn-sm">Audit logs</Link>} />
            <ul className="stack-sm">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="row-between">
                  <div>
                    <span className="small strong">{entry.action.replaceAll("_", " ").toLowerCase()}</span>
                    <span className="tiny muted"> · {entry.user?.name ?? "system"}</span>
                  </div>
                  <span className="tiny muted">{timeAgo(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Matching health" />
            <div className="row-between small"><span className="muted">Matching success rate</span><span className="strong mono">{overview.matchingSuccessRate}%</span></div>
            <div className="row-between small" style={{ marginTop: 6 }}><span className="muted">Cancellation rate</span><span className="strong mono">{overview.cancellationRate}%</span></div>
            <div className="row-between small" style={{ marginTop: 6 }}><span className="muted">Requests in range</span><span className="strong mono">{overview.totalRequests}</span></div>
            <Link href="/admin/matching" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Tune the algorithm</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
