import Link from "next/link";
import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AREAS } from "@/lib/constants";
import { formatDate, taka } from "@/lib/format";
import { PageHeader, Card, SectionHeader, StatCard, Avatar } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/ProfileForms";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

const CUSTOMER_LINKS = [
  { href: "/requests", icon: "📋", label: "My requests", hint: "Track everything you've asked for" },
  { href: "/bookings", icon: "📅", label: "Bookings", hint: "Confirmed and upcoming jobs" },
  { href: "/history", icon: "🕘", label: "Service history", hint: "Past jobs, rebook in one tap" },
  { href: "/invoices", icon: "🧾", label: "Invoices", hint: "Every completed job, itemised" },
  { href: "/favorites", icon: "⭐", label: "Favourite providers", hint: "Book trusted pros faster" },
  { href: "/notifications", icon: "🔔", label: "Notifications", hint: "Status updates and reminders" },
];

const OTHER_LINKS = [
  { href: "/notifications", icon: "🔔", label: "Notifications", hint: "Status updates and reminders" },
  { href: "/", icon: "🏠", label: "Main site", hint: "Back to the public HomeEase pages" },
];

export default async function ProfilePage() {
  const user = await requireAuth();
  const isCustomer = user.role === "CUSTOMER";

  const [requests, completed, spent, favourites] = isCustomer
    ? await Promise.all([
        prisma.serviceRequest.count({ where: { customerId: user.id } }),
        prisma.booking.count({ where: { customerId: user.id, status: "COMPLETED" } }),
        prisma.invoice.aggregate({ _sum: { total: true }, where: { booking: { customerId: user.id } } }),
        prisma.favoriteProvider.count({ where: { customerId: user.id } }),
      ])
    : [0, 0, { _sum: { total: 0 } }, 0];

  const links = isCustomer ? CUSTOMER_LINKS : OTHER_LINKS;

  return (
    <>
      <PageHeader title="My profile" subtitle="Your account, your bookings and your settings — all in one place" />

      <Card style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ flexWrap: "wrap", gap: 14 }}>
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={user.name} src={user.avatar} size="lg" />
            <div>
              <h2>{user.name}</h2>
              <p className="small muted">{user.email} · {user.phone}</p>
              <p className="tiny muted">{user.address}{user.area ? `, ${user.area}` : ""}</p>
              <span className="badge badge-brand" style={{ marginTop: 6 }}>{user.role.toLowerCase()}</span>
            </div>
          </div>
          {isCustomer ? <Link href="/book" className="btn">Book a service</Link> : null}
        </div>
      </Card>

      {isCustomer ? (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <StatCard label="Requests made" value={requests} />
          <StatCard label="Jobs completed" value={completed} />
          <StatCard label="Total spent" value={taka(spent._sum.total ?? 0)} />
          <StatCard label="Favourites saved" value={favourites} />
        </div>
      ) : null}

      <Card style={{ marginBottom: 16 }}>
        <SectionHeader title="Everything in your account" subtitle="Jump straight to what you need" />
        <div className="grid grid-3">
          {links.map((link) => (
            <Link key={link.href + link.label} href={link.href} className="card card-hover card-tight">
              <div className="row" style={{ gap: 10 }}>
                <span aria-hidden="true" style={{ fontSize: "1.15rem" }}>{link.icon}</span>
                <div>
                  <div className="small strong">{link.label}</div>
                  <div className="tiny muted">{link.hint}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <Card>
          <SectionHeader title="Account details" subtitle="Changing your area updates how providers are matched to you" />
          <ProfileForm user={user} areas={AREAS.map((area) => area.name)} />
        </Card>

        <div className="stack">
          <Card>
            <SectionHeader title="Change password" subtitle="This signs you out of other devices" />
            <PasswordForm />
          </Card>
          <Card>
            <SectionHeader title="Session" subtitle={`Member since ${formatDate(user.createdAt)}`} />
            <p className="small muted" style={{ marginBottom: 12 }}>
              Signing out clears your cookie and revokes the session on the server.
            </p>
            <LogoutButton className="btn-secondary" />
          </Card>
        </div>
      </div>
    </>
  );
}
