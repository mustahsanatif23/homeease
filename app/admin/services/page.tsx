import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleServiceAction } from "@/actions/admin.actions";
import { taka } from "@/lib/format";
import { PageHeader, Card, SectionHeader, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { ServiceForm } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireRole("ADMIN");
  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      include: { category: true, _count: { select: { providers: true, requests: true } } },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.serviceCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Services" subtitle={`${services.length} services in the catalog`} />
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)", gap: 16, alignItems: "start" }}>
        <Card>
          <SectionHeader title="Catalog" subtitle="Expand a service to edit it" />
          {services.length === 0 ? (
            <EmptyState icon="🧰" title="No services yet" />
          ) : (
            <div className="stack-sm">
              {services.map((service) => (
                <details key={service.id} className="card card-tight">
                  <summary className="row-between" style={{ cursor: "pointer", listStyle: "none" }}>
                    <span>
                      <span className="small strong">{service.name}</span>
                      <span className="tiny muted"> · {service.category.name} · {service._count.providers} providers · {service._count.requests} requests</span>
                    </span>
                    <span className="row" style={{ gap: 10 }}>
                      <span className="mono small">{taka(service.basePrice)}</span>
                      <span className={`badge ${service.active ? "badge-success" : "badge-muted"}`}>{service.active ? "active" : "off"}</span>
                    </span>
                  </summary>
                  <div style={{ marginTop: 12 }} className="stack">
                    <ServiceForm categories={categories} service={service} />
                    <ConfirmButton
                      action={toggleServiceAction.bind(null, service.id)}
                      className="btn-ghost btn-sm"
                      confirmText={service.active ? "Hide this service from customers?" : "Make this service bookable again?"}
                    >
                      {service.active ? "Disable service" : "Enable service"}
                    </ConfirmButton>
                  </div>
                </details>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="New service" />
          <ServiceForm categories={categories} />
        </Card>
      </div>
    </>
  );
}
