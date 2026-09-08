import Link from "next/link";
import BackButton from "@/components/BackButton";
import { Logo } from "@/components/Brand";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServiceBySlug } from "@/services/catalog.service";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { taka } from "@/lib/format";
import { Stars } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found" };
  return { title: service.name, description: service.description };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [service, user] = await Promise.all([getServiceBySlug(slug), getCurrentUser()]);
  if (!service || !service.active) notFound();

  const providers = await prisma.providerService.findMany({
    where: { serviceId: service.id, provider: { verificationStatus: "APPROVED" } },
    include: { provider: { include: { user: { select: { name: true, area: true } } } } },
    orderBy: { provider: { rating: "desc" } },
    take: 6,
  });

  return (
    <>
      <header className="landing-nav">
        <div className="container inner">
          <Logo />
          <Link href={user ? `/book?service=${service.id}` : "/register"} className="btn btn-sm">Book this service</Link>
        </div>
      </header>

      <main className="container" style={{ padding: "26px 20px 60px", maxWidth: 880 }}>
        <BackButton fallback="/services" label="Back to services" />
        <div style={{ height: 18 }} />
        <p className="eyebrow">{service.category.name}</p>
        <h1>{service.name}</h1>
        <p className="muted" style={{ margin: "10px 0 18px" }}>{service.description}</p>

        <div className="grid grid-3" style={{ marginBottom: 26 }}>
          <div className="stat-card"><div className="stat-label">Starting price</div><div className="stat-value mono">{taka(service.basePrice)}</div></div>
          <div className="stat-card"><div className="stat-label">Typical duration</div><div className="stat-value mono">{Math.round(service.estimatedDuration / 60 * 10) / 10} h</div></div>
          <div className="stat-card"><div className="stat-label">Providers</div><div className="stat-value mono">{providers.length}</div></div>
        </div>

        <h2 style={{ marginBottom: 12 }}>Available professionals</h2>
        <div className="grid grid-2">
          {providers.map((offer) => (
            <div key={offer.id} className="card">
              <div className="row-between">
                <div>
                  <h3>{offer.provider.businessName}</h3>
                  <p className="tiny muted">{offer.provider.user.area} · {offer.experienceYears} yrs · {offer.expertiseLevel.toLowerCase()}</p>
                </div>
                <span className="strong mono">{taka(offer.price)}</span>
              </div>
              <div className="row-between" style={{ marginTop: 10 }}>
                <Stars rating={offer.provider.rating} count={offer.provider.ratingCount} />
                <Link href={`/providers/${offer.providerId}`} className="btn btn-secondary btn-sm">Profile</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="card center" style={{ marginTop: 26 }}>
          <h2>Ready to book?</h2>
          <p className="muted small" style={{ margin: "8px 0 14px" }}>We&apos;ll rank every available provider for your time and location.</p>
          <Link href={user ? `/book?service=${service.id}` : "/register"} className="btn btn-lg">Find My Best Match</Link>
        </div>
      </main>
    </>
  );
}
