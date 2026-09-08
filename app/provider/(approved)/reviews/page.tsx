import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, StatCard, EmptyState, Stars, Meter } from "@/components/ui";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function ProviderReviewsPage() {
  const user = await requireRole("PROVIDER");
  const providerId = user.providerId!;
  const [profile, reviews] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: providerId } }),
    prisma.review.findMany({
      where: { providerId },
      include: { customer: { select: { name: true } }, booking: { include: { request: { include: { service: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const average = (key: "qualityRating" | "professionalismRating" | "punctualityRating" | "valueRating") => {
    const values = reviews.map((r) => r[key]).filter((v): v is number => v != null);
    return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
  };

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <>
      <PageHeader title="Reviews" subtitle="What your customers say — this feeds your match score" />
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="Overall rating" value={profile && profile.rating > 0 ? `${profile.rating.toFixed(1)}★` : "New"} hint={`${reviews.length} reviews`} />
        <StatCard label="Quality" value={average("qualityRating").toFixed(1)} />
        <StatCard label="Professionalism" value={average("professionalismRating").toFixed(1)} />
        <StatCard label="Punctuality" value={average("punctualityRating").toFixed(1)} />
      </div>

      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Rating distribution</h2>
        <div className="stack-sm">
          {distribution.map((row) => (
            <div key={row.star} className="row" style={{ gap: 12 }}>
              <span className="small mono" style={{ width: 34 }}>{row.star}★</span>
              <div style={{ flex: 1 }}><Meter value={reviews.length === 0 ? 0 : row.count / reviews.length} /></div>
              <span className="tiny muted" style={{ width: 30, textAlign: "right" }}>{row.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {reviews.length === 0 ? (
        <Card><EmptyState icon="⭐" title="No reviews yet" message="Complete jobs and ask customers to rate you." /></Card>
      ) : (
        <div className="stack-sm">
          {reviews.map((review) => (
            <Card key={review.id} className="card-tight">
              <div className="row-between">
                <Stars rating={review.rating} />
                <span className="tiny muted">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment ? <p className="small" style={{ marginTop: 8 }}>{review.comment}</p> : null}
              <p className="tiny muted" style={{ marginTop: 6 }}>{review.customer.name} · {review.booking.request.service.name}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
