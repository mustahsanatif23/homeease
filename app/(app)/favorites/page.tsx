import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleFavoriteAction } from "@/actions/customer.actions";
import { PageHeader, EmptyState, Card, Avatar, Stars } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";

export const metadata: Metadata = { title: "Favourite providers" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireRole("CUSTOMER");
  const favorites = await prisma.favoriteProvider.findMany({
    where: { customerId: user.id },
    include: {
      provider: {
        include: { user: { select: { name: true, area: true, avatar: true } }, services: { include: { service: true }, take: 3 } },
      },
    },
  });

  return (
    <>
      <PageHeader title="Favourite providers" subtitle="Book trusted professionals faster" />
      {favorites.length === 0 ? (
        <Card><EmptyState icon="⭐" title="No favourite providers yet." message="Save trusted providers for faster booking." action={<Link href="/services" className="btn">Browse services</Link>} /></Card>
      ) : (
        <div className="grid grid-3">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="card">
              <div className="row" style={{ gap: 10 }}>
                <Avatar name={favorite.provider.businessName} src={favorite.provider.user.avatar} />
                <div>
                  <h3>{favorite.provider.businessName}</h3>
                  <p className="tiny muted">{favorite.provider.user.area}</p>
                </div>
              </div>
              <div style={{ marginTop: 10 }}><Stars rating={favorite.provider.rating} count={favorite.provider.ratingCount} /></div>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                {favorite.provider.services.map((s) => s.service.name).join(" · ")}
              </p>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <Link href={`/providers/${favorite.provider.id}`} className="btn btn-secondary btn-sm">Profile</Link>
                {favorite.provider.services[0] ? (
                  <Link href={`/book?service=${favorite.provider.services[0].serviceId}`} className="btn btn-sm">Book</Link>
                ) : null}
                <ConfirmButton
                  action={toggleFavoriteAction.bind(null, favorite.providerId)}
                  className="btn-ghost btn-sm"
                  confirmText="Remove this provider from favourites?"
                >
                  Remove
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
