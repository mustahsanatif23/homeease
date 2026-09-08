import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, SectionHeader, EmptyState } from "@/components/ui";
import { CategoryForm } from "@/components/AdminForms";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireRole("ADMIN");
  const categories = await prisma.serviceCategory.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Categories" subtitle="Group services so customers can find them" />
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="All categories" subtitle={`${categories.length} total`} />
          {categories.length === 0 ? (
            <EmptyState icon="🗂️" title="No categories yet" />
          ) : (
            <div className="stack-sm">
              {categories.map((category) => (
                <details key={category.id} className="card card-tight">
                  <summary className="row-between" style={{ cursor: "pointer", listStyle: "none" }}>
                    <span className="row" style={{ gap: 10 }}>
                      <span aria-hidden="true">{category.icon}</span>
                      <span>
                        <span className="small strong">{category.name}</span>
                        <span className="tiny muted"> · {category._count.services} services</span>
                      </span>
                    </span>
                    <span className={`badge ${category.active ? "badge-success" : "badge-muted"}`}>{category.active ? "active" : "hidden"}</span>
                  </summary>
                  <div style={{ marginTop: 12 }}>
                    <CategoryForm category={category} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title="New category" />
          <CategoryForm />
        </Card>
      </div>
    </>
  );
}
