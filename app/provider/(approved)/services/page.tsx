import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listServices } from "@/services/catalog.service";
import { removeProviderServiceAction } from "@/actions/provider.actions";
import { taka } from "@/lib/format";
import { PageHeader, Card, SectionHeader, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { ProviderServiceForm } from "@/components/ProviderForms";

export const metadata: Metadata = { title: "My services" };
export const dynamic = "force-dynamic";

export default async function ProviderServicesPage() {
  const user = await requireRole("PROVIDER");
  const [offered, catalog] = await Promise.all([
    prisma.providerService.findMany({
      where: { providerId: user.providerId! },
      include: { service: { include: { category: true } } },
      orderBy: { service: { name: "asc" } },
    }),
    listServices(),
  ]);

  return (
    <>
      <PageHeader title="My services" subtitle="The services you offer and what you charge for them" />
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Offered services" subtitle={`${offered.length} active`} />
          {offered.length === 0 ? (
            <EmptyState icon="🧰" title="No services yet" message="Add at least one service so HomeEase can match you to jobs." />
          ) : (
            <ul className="stack-sm">
              {offered.map((entry) => (
                <li key={entry.id} className="card card-tight row-between">
                  <div>
                    <div className="small strong">{entry.service.name}</div>
                    <div className="tiny muted">
                      {entry.service.category.name} · {entry.expertiseLevel.toLowerCase()} · {entry.experienceYears} yrs · base {taka(entry.service.basePrice)}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="strong mono small">{taka(entry.price)}</span>
                    <ConfirmButton action={removeProviderServiceAction.bind(null, entry.serviceId)} className="btn-ghost btn-sm" confirmText="Stop offering this service?">
                      Remove
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Add or update a service" subtitle="Pricing close to the base rate scores better on match" />
          <ProviderServiceForm
            services={catalog.map((s) => ({ id: s.id, name: s.name, basePrice: s.basePrice, category: s.category.name }))}
          />
        </Card>
      </div>
    </>
  );
}
