"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, icon, children, count, exact = false }: { href: string; icon?: string; children: ReactNode; count?: number; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} className="nav-link" aria-current={active ? "page" : undefined}>
      {icon ? <span className="nav-icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
      {count ? <span className="nav-count">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}

export function MobileNavLink({ href, icon, children, exact = false }: { href: string; icon: string; children: ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      <span className="icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
