import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listCategories, listServices } from "@/services/catalog.service";
import { AREAS } from "@/lib/constants";
import BookingWizard from "./BookingWizard";

export const metadata: Metadata = { title: "Book a service" };
export const dynamic = "force-dynamic";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const user = await requireRole("CUSTOMER");
  const params = await searchParams;

  const [categories, services, addresses] = await Promise.all([
    listCategories(),
    listServices(),
    prisma.savedAddress.findMany({ where: { customerId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <>
      <div className="page-head">
        <h1>Book a service</h1>
        <p className="muted small">Tell us what you need — we&apos;ll handle the matching and scheduling.</p>
      </div>
      <div style={{ maxWidth: 760 }}>
        <BookingWizard
          categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, description: c.description }))}
          services={services.map((s) => ({
            id: s.id, categoryId: s.categoryId, name: s.name, description: s.description,
            basePrice: s.basePrice, estimatedDuration: s.estimatedDuration,
          }))}
          areas={AREAS.map((a) => a.name)}
          addresses={addresses.map((a) => ({ id: a.id, label: a.label, address: a.address, area: a.area }))}
          defaultPhone={user.phone ?? ""}
          defaultAddress={user.address ?? ""}
          defaultArea={user.area ?? AREAS[0].name}
          preselectedServiceId={params.service}
        />
      </div>
    </>
  );
}
