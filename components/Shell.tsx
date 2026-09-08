import Link from "next/link";
import { Logo } from "@/components/Brand";
import type { ReactNode } from "react";
import { NavLink, MobileNavLink } from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";
import { Avatar } from "@/components/ui";
import { unreadCount } from "@/services/notification.service";
import { unreadMessageCount } from "@/services/message.service";
import type { SessionUser } from "@/lib/auth";

interface NavItem { href: string; icon: string; label: string; exact?: boolean }

const CUSTOMER_NAV: NavItem[] = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard", exact: true },
  { href: "/book", icon: "✨", label: "Book a service" },
  { href: "/services", icon: "🧰", label: "Services" },
  { href: "/requests", icon: "📋", label: "My requests" },
  { href: "/bookings", icon: "📅", label: "Bookings" },
  { href: "/messages", icon: "💬", label: "Messages" },
  { href: "/history", icon: "🕘", label: "History" },
  { href: "/favorites", icon: "⭐", label: "Favourites" },
  { href: "/invoices", icon: "🧾", label: "Invoices" },
  { href: "/notifications", icon: "🔔", label: "Notifications" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

const PROVIDER_NAV: NavItem[] = [
  { href: "/provider/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/provider/requests", icon: "📥", label: "Incoming jobs" },
  { href: "/provider/bookings", icon: "📅", label: "My jobs" },
  { href: "/provider/messages", icon: "💬", label: "Messages" },
  { href: "/provider/calendar", icon: "🗓️", label: "Calendar" },
  { href: "/provider/services", icon: "🧰", label: "My services" },
  { href: "/provider/earnings", icon: "💰", label: "Earnings" },
  { href: "/provider/reviews", icon: "⭐", label: "Reviews" },
  { href: "/notifications", icon: "🔔", label: "Notifications" },
  { href: "/provider/profile", icon: "👤", label: "Profile" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", icon: "📊", label: "Dashboard", exact: true },
  { href: "/admin/users", icon: "👥", label: "Users" },
  { href: "/admin/providers", icon: "🛠️", label: "Providers" },
  { href: "/admin/requests", icon: "📋", label: "Requests" },
  { href: "/admin/bookings", icon: "📅", label: "Bookings" },
  { href: "/admin/services", icon: "🧰", label: "Services" },
  { href: "/admin/categories", icon: "🗂️", label: "Categories" },
  { href: "/admin/invoices", icon: "🧾", label: "Invoices" },
  { href: "/admin/reviews", icon: "⭐", label: "Reviews" },
  { href: "/admin/analytics", icon: "📈", label: "Analytics" },
  { href: "/admin/matching", icon: "🎯", label: "Matching" },
  { href: "/admin/audit-logs", icon: "🧭", label: "Audit logs" },
];

function navFor(role: string) {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "PROVIDER") return PROVIDER_NAV;
  return CUSTOMER_NAV;
}

function mobileNavFor(role: string) {
  if (role === "ADMIN") {
    return [
      { href: "/admin", icon: "📊", label: "Home", exact: true },
      { href: "/admin/users", icon: "👥", label: "Users" },
      { href: "/admin/providers", icon: "🛠️", label: "Providers" },
      { href: "/admin/requests", icon: "📋", label: "Requests" },
      { href: "/admin/analytics", icon: "📈", label: "Stats" },
    ];
  }
  if (role === "PROVIDER") {
    return [
      { href: "/provider/dashboard", icon: "🏠", label: "Home" },
      { href: "/provider/requests", icon: "📥", label: "Jobs" },
      { href: "/provider/messages", icon: "💬", label: "Chats" },
      { href: "/notifications", icon: "🔔", label: "Alerts" },
      { href: "/provider/profile", icon: "👤", label: "Profile" },
    ];
  }
  return [
    { href: "/dashboard", icon: "🏠", label: "Home", exact: true },
    { href: "/requests", icon: "📋", label: "Requests" },
    { href: "/messages", icon: "💬", label: "Chats" },
    { href: "/notifications", icon: "🔔", label: "Alerts" },
    { href: "/profile", icon: "👤", label: "Profile" },
  ];
}

export default async function Shell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [unread, unreadMessages] = await Promise.all([
    unreadCount(user.id),
    user.role === "ADMIN" ? Promise.resolve(0) : unreadMessageCount(user.id, user.providerId),
  ]);
  const messagesHref = user.role === "PROVIDER" ? "/provider/messages" : "/messages";
  const nav = navFor(user.role);
  const mobileNav = mobileNavFor(user.role);
  const home = user.role === "ADMIN" ? "/admin" : user.role === "PROVIDER" ? "/provider/dashboard" : "/dashboard";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand"><Logo href="/" height={28} /></div>
        <nav aria-label="Main">
          <ul className="stack-sm" style={{ gap: 2 }}>
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  icon={item.icon}
                  exact={item.exact}
                  count={item.href === "/notifications" ? unread : item.href === messagesHref ? unreadMessages : undefined}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-section">Account</div>
        <div style={{ padding: "0 10px" }} className="stack-sm">
          <div className="row" style={{ gap: 9 }}>
            <Avatar name={user.name} src={user.avatar} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div className="small strong truncate">{user.name}</div>
              <div className="tiny muted truncate">{user.email}</div>
            </div>
          </div>
          <LogoutButton className="btn-secondary btn-sm btn-block" />
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="hide-mobile"><Logo href="/" height={26} /></div>
          <Link href={home} className="btn btn-ghost btn-sm hide-mobile">Dashboard</Link>
          <span className="badge badge-brand hide-mobile">{user.role.toLowerCase()}</span>
          <span className="spacer" />
          <Link href="/notifications" className="btn btn-ghost btn-sm" aria-label={`Notifications, ${unread} unread`}>
            🔔 {unread > 0 ? <span className="nav-count">{unread > 99 ? "99+" : unread}</span> : null}
          </Link>
          {user.role === "CUSTOMER" ? <Link href="/book" className="btn btn-sm">Book a service</Link> : null}
          <div className="hide-mobile"><LogoutButton /></div>
        </header>
        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile">
        {mobileNav.map((item) => (
          <MobileNavLink key={item.href} href={item.href} icon={item.icon} exact={item.exact}>
            {item.label}
          </MobileNavLink>
        ))}
      </nav>
    </div>
  );
}
