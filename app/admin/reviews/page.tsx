import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, StatCard, EmptyState, Stars } from "@/components/ui";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireRole("ADMIN");
  const [reviews, average] = await Promise.all([
    prisma.review.findMany({
      include: {
        customer: { select: { name: true } },
        provider: { select: { businessName: true } },
        booking: { include: { request: { include: { service: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const low = reviews.filter((r) => r.rating <= 2);

  return (
    <>
      <PageHeader title="Reviews" subtitle="Customer feedback across the platform" />
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <StatCard label="Total reviews" value={average._count._all} />
        <StatCard label="Average rating" value={`${(average._avg.rating ?? 0).toFixed(2)}★`} />
        <StatCard label="Low ratings (≤2)" value={low.length} hint="Worth following up" />
      </div>

      {reviews.length === 0 ? (
        <Card><EmptyState icon="⭐" title="No reviews yet" /></Card>
      ) : (
        <div className="stack-sm">
          {reviews.map((review) => (
            <Card key={review.id} className="card-tight">
              <div className="row-between">
                <div>
                  <div className="row" style={{ gap: 10 }}>
                    <Stars rating={review.rating} />
                    <span className="small strong">{review.provider.businessName}</span>
                  </div>
                  <div className="tiny muted">{review.customer.name} · {review.booking.request.service.name}</div>
                </div>
                <span className="tiny muted">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment ? <p className="small" style={{ marginTop: 8 }}>{review.comment}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
