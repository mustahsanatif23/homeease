import Link from "next/link";
import BackButton from "@/components/BackButton";
import { Logo } from "@/components/Brand";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProvider } from "@/services/provider.service";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleFavoriteAction } from "@/actions/customer.actions";
import { taka, formatDate } from "@/lib/format";
import { DAY_NAMES } from "@/lib/constants";
import { Avatar, Stars, Card, StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const provider = await getPublicProvider(id);
  return { title: provider?.businessName ?? "Provider" };
}

export default async function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [provider, user] = await Promise.all([getPublicProvider(id), getCurrentUser()]);
  if (!provider) notFound();

  const favorite = user?.role === "CUSTOMER"
    ? await prisma.favoriteProvider.findUnique({ where: { customerId_providerId: { customerId: user.id, providerId: id } } })
    : null;

  return (
    <>
      <header className="landing-nav">
        <div className="container inner">
          <Logo />
          <Link href={user ? "/book" : "/register"} className="btn btn-sm">Book a service</Link>
        </div>
      </header>

      <main className="container" style={{ padding: "26px 20px 60px", maxWidth: 900 }}>
        <BackButton fallback="/services" />
        <div style={{ height: 18 }} />
        <div className="card">
          <div className="row-between">
            <div className="row" style={{ gap: 14 }}>
              <Avatar name={provider.businessName} src={provider.user.avatar} size="lg" />
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <h1>{provider.businessName}</h1>
                  <span className="badge badge-success">✓ Verified</span>
                </div>
                <p className="small muted">{provider.user.name} · {provider.user.area} · {provider.experienceYears} years experience</p>
                <div style={{ marginTop: 6 }}><Stars rating={provider.rating} count={provider.ratingCount} /></div>
              </div>
            </div>
            {user?.role === "CUSTOMER" ? (
              <form action={toggleFavoriteAction.bind(null, provider.id)}>
                <SubmitButton className={favorite ? "btn-secondary btn-sm" : "btn-sm"}>
                  {favorite ? "★ Saved" : "☆ Save provider"}
                </SubmitButton>
              </form>
            ) : null}
          </div>
          {provider.bio ? <p className="small muted" style={{ marginTop: 14 }}>{provider.bio}</p> : null}
        </div>

        <div className="grid grid-3" style={{ margin: "16px 0" }}>
          <StatCard label="Completed jobs" value={provider.completedJobs} />
          <StatCard label="Rating" value={provider.rating > 0 ? `${provider.rating.toFixed(1)}★` : "New"} hint={`${provider.ratingCount} reviews`} />
          <StatCard label="Service radius" value={`${provider.serviceRadiusKm} km`} />
        </div>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <Card>
            <h2 style={{ marginBottom: 12 }}>Services & pricing</h2>
            <ul className="stack-sm">
              {provider.services.map((offer) => (
                <li key={offer.id} className="row-between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div className="small strong">{offer.service.name}</div>
                    <div className="tiny muted">{offer.service.category.name} · {offer.expertiseLevel.toLowerCase()}</div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="mono strong small">{taka(offer.price)}</span>
                    {user?.role === "CUSTOMER" ? <Link href={`/book?service=${offer.serviceId}`} className="btn btn-secondary btn-sm">Book</Link> : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 style={{ marginBottom: 12 }}>Working hours</h2>
            <ul className="stack-sm small">
              {provider.availability.map((day) => (
                <li key={day.id} className="row-between">
                  <span className="muted">{DAY_NAMES[day.dayOfWeek]}</span>
                  <span className={day.isAvailable ? "strong" : "muted"}>{day.isAvailable ? `${day.startTime} – ${day.endTime}` : "Closed"}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Reviews</h2>
          {provider.reviews.length === 0 ? (
            <Card><p className="muted small">No reviews yet.</p></Card>
          ) : (
            <div className="stack-sm">
              {provider.reviews.map((review) => (
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
        </div>
      </main>
    </>
  );
}
