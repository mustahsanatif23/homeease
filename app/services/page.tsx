import Link from "next/link";
import type { Metadata } from "next";
import { listCategories, listServices } from "@/services/catalog.service";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { taka } from "@/lib/format";
import { Logo } from "@/components/Brand";
import BackButton from "@/components/BackButton";

export const metadata: Metadata = {
  title: "All services",
  description: "Browse every home service available on HomeEase, from AC repair to home shifting.",
};
export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const [categories, allServices, user] = await Promise.all([listCategories(), listServices(), getCurrentUser()]);

  const services = query
    ? allServices.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description.toLowerCase().includes(query) ||
          service.category.name.toLowerCase().includes(query),
      )
    : allServices;

  return (
    <>
      <header className="landing-nav">
        <div className="container inner">
          <Logo />
          <nav className="row" style={{ gap: 8 }}>
            {user ? (
              <>
                <Link href={homeFor(user.role)} className="btn btn-secondary btn-sm">My dashboard</Link>
                {user.role === "CUSTOMER" ? <Link href="/book" className="btn btn-sm">Book a service</Link> : null}
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
                <Link href="/register" className="btn btn-sm">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: "26px 20px 70px" }}>
        <BackButton fallback="/" />

        <div className="page-head" style={{ marginTop: 16 }}>
          <h1>All services</h1>
          <p className="muted small">
            {query
              ? `${services.length} result${services.length === 1 ? "" : "s"} for “${params.q}”`
              : `${allServices.length} services across ${categories.length} categories.`}
          </p>
        </div>

        <form className="search-pill" style={{ marginBottom: 30 }}>
          <span aria-hidden="true">🔍</span>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search services" aria-label="Search services" />
          <button type="submit" className="btn btn-sm">Search</button>
        </form>

        {services.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon" aria-hidden="true">🔍</div>
            <div className="title">Nothing matched that search.</div>
            <p className="small muted">Try a broader word — “clean”, “repair”, “electric”.</p>
            <Link href="/services" className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>Show everything</Link>
          </div>
        ) : (
          categories.map((category) => {
            const items = services.filter((service) => service.categoryId === category.id);
            if (items.length === 0) return null;
            return (
              <section key={category.id} style={{ marginBottom: 34 }}>
                <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                  <span className="icon" aria-hidden="true">{category.icon}</span>
                  <div>
                    <h2>{category.name}</h2>
                    <p className="tiny muted">{category.description}</p>
                  </div>
                </div>
                <div className="grid grid-3">
                  {items.map((service) => (
                    <Link key={service.id} href={`/services/${service.slug}`} className="card card-hover">
                      <h3>{service.name}</h3>
                      <p className="small muted" style={{ margin: "8px 0 12px" }}>{service.description}</p>
                      <div className="row-between">
                        <span className="strong">{taka(service.basePrice)}</span>
                        <span className="tiny muted">~{Math.round((service.estimatedDuration / 60) * 10) / 10} h</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </>
  );
}
