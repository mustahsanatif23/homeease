import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, taka } from "@/lib/format";
import { PageHeader, Card, StatusBadge, EmptyState, Stars, Avatar } from "@/components/ui";
import { VerificationForm } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Providers" };
export const dynamic = "force-dynamic";

const TABS = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const status = TABS.includes(params.status as typeof TABS[number]) ? params.status! : "PENDING";

  const [providers, counts] = await Promise.all([
    prisma.providerProfile.findMany({
      where: { verificationStatus: status },
      include: {
        user: { select: { name: true, email: true, phone: true, area: true, avatar: true, createdAt: true, accountStatus: true } },
        services: { include: { service: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.providerProfile.groupBy({ by: ["verificationStatus"], _count: { _all: true } }),
  ]);

  const countFor = (key: string) => counts.find((c) => c.verificationStatus === key)?._count._all ?? 0;

  return (
    <>
      <PageHeader title="Providers" subtitle="Verify applications and monitor active professionals" />

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((tab) => (
          <Link key={tab} href={`/admin/providers?status=${tab}`} className={`tab ${status === tab ? "active" : ""}`}>
            {tab.charAt(0) + tab.slice(1).toLowerCase()} <span className="tiny muted">({countFor(tab)})</span>
          </Link>
        ))}
      </div>

      {providers.length === 0 ? (
        <Card><EmptyState icon="🛠️" title={`No ${status.toLowerCase()} providers`} /></Card>
      ) : (
        <div className="stack">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <div className="row-between">
                <div className="row" style={{ gap: 12 }}>
                  <Avatar name={provider.businessName} src={provider.user.avatar} />
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <h3>{provider.businessName}</h3>
                      <StatusBadge status={provider.verificationStatus} />
                    </div>
                    <p className="tiny muted">
                      {provider.user.name} · {provider.user.email} · {provider.user.phone} · {provider.user.area}
                    </p>
                    <p className="tiny muted">
                      Applied {formatDate(provider.user.createdAt)} · {provider.experienceYears} yrs experience · radius {provider.serviceRadiusKm} km
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Stars rating={provider.rating} count={provider.ratingCount} />
                  <div className="tiny muted">{provider.completedJobs} jobs · {taka(provider.totalEarnings)}</div>
                </div>
              </div>
              {provider.bio ? <p className="small muted" style={{ margin: "10px 0" }}>{provider.bio}</p> : null}
              <p className="tiny muted">Services: {provider.services.map((s) => s.service.name).join(", ") || "none yet"}</p>
              <div className="row-between" style={{ marginTop: 12 }}>
                {provider.verificationStatus !== "APPROVED" ? <VerificationForm providerId={provider.id} /> : <span className="tiny muted">Approved and live in matching.</span>}
                <Link href={`/admin/users/${provider.userId}`} className="btn btn-ghost btn-sm">Manage account</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
