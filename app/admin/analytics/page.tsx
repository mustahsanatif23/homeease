import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import {
  getAdminOverview, getRequestsSeries, getRevenueSeries, getCategoryBreakdown,
  getStatusBreakdown, getTopProviders, getAverageCompletionMinutes, type RangeKey,
} from "@/services/analytics.service";
import { taka } from "@/lib/format";
import { PageHeader, Card, StatCard, SectionHeader, EmptyState } from "@/components/ui";
import { LineChart, BarChart, DonutChart } from "@/components/Charts";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "Year" },
];

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const range = (RANGES.find((r) => r.key === params.range)?.key ?? "30d") as RangeKey;

  const [overview, requests, revenue, categories, statuses, topProviders, avgMinutes] = await Promise.all([
    getAdminOverview(range),
    getRequestsSeries(range),
    getRevenueSeries(range),
    getCategoryBreakdown(),
    getStatusBreakdown(),
    getTopProviders(8),
    getAverageCompletionMinutes(),
  ]);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Platform performance and demand patterns" />

      <div className="tabs" style={{ marginBottom: 16 }}>
        {RANGES.map((option) => (
          <Link key={option.key} href={`/admin/analytics?range=${option.key}`} className={`tab ${range === option.key ? "active" : ""}`}>
            {option.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Requests" value={overview.totalRequests} hint={`${overview.urgentCount} urgent`} />
        <StatCard label="Completed jobs" value={overview.completedJobs} />
        <StatCard label="Revenue" value={taka(overview.revenue)} />
        <StatCard label="Avg job time" value={avgMinutes > 0 ? `${avgMinutes} min` : "—"} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16, alignItems: "start" }}>
        <Card>
          <SectionHeader title="Requests over time" />
          <LineChart data={requests} />
        </Card>
        <Card>
          <SectionHeader title="Revenue over time" />
          {revenue.length === 0 ? <EmptyState icon="📈" title="No invoices in this range" /> : <BarChart data={revenue} />}
        </Card>
      </div>

      <div className="grid grid-3" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Demand by category" />
          {categories.length === 0 ? <EmptyState icon="🗂️" title="No data" /> : <BarChart data={categories.slice(0, 8)} height={220} />}
        </Card>
        <Card>
          <SectionHeader title="Booking status mix" />
          {statuses.length === 0 ? <EmptyState icon="📊" title="No bookings yet" /> : <DonutChart data={statuses} />}
        </Card>
        <Card>
          <SectionHeader title="Quality signals" />
          <ul className="stack-sm small">
            <li className="row-between"><span className="muted">Average rating</span><span className="mono strong">{overview.averageRating || "—"}★</span></li>
            <li className="row-between"><span className="muted">Matching success</span><span className="mono strong">{overview.matchingSuccessRate}%</span></li>
            <li className="row-between"><span className="muted">Cancellation rate</span><span className="mono strong">{overview.cancellationRate}%</span></li>
            <li className="row-between"><span className="muted">Active providers</span><span className="mono strong">{overview.providers}</span></li>
          </ul>
          <div style={{ marginTop: 14 }}>
            <div className="stat-label">Top providers</div>
            <ul className="stack-sm small" style={{ marginTop: 8 }}>
              {topProviders.map((provider) => (
                <li key={provider.id} className="row-between">
                  <span>{provider.businessName}</span>
                  <span className="mono tiny">{provider.completedJobs} · {provider.rating > 0 ? provider.rating.toFixed(1) : "—"}★</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
