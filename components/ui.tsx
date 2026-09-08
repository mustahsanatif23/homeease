import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="row-between" style={{ marginBottom: 14 }}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p className="muted small">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-head row-between">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted small">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  REQUESTED: "badge-warning", PENDING: "badge-warning", MATCHED: "badge-info",
  ACCEPTED: "badge-info", ASSIGNED: "badge-info", BOOKED: "badge-info",
  ON_THE_WAY: "badge-brand", IN_PROGRESS: "badge-brand",
  COMPLETED: "badge-success", ACTIVE: "badge-success", APPROVED: "badge-success", PAID: "badge-success",
  CANCELLED: "badge-danger", REJECTED: "badge-danger", SUSPENDED: "badge-danger", NO_PROVIDER: "badge-danger",
  DEACTIVATED: "badge", RESCHEDULED: "badge-warning", UNPAID: "badge-warning", URGENT: "badge-danger", HIGH: "badge-warning",
};

export function Badge({ children, tone, status }: { children: ReactNode; tone?: string; status?: string }) {
  const cls = tone ?? (status ? TONES[status] ?? "badge" : "badge");
  return <span className={`badge ${cls === "badge" ? "" : cls}`}>{children}</span>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge status={status}><span className="dot" />{label ?? status.replaceAll("_", " ").toLowerCase()}</Badge>;
}

export function Avatar({ name, src, size = "" }: { name: string; src?: string | null; size?: "sm" | "lg" | "" }) {
  const cls = size === "sm" ? "avatar avatar-sm" : size === "lg" ? "avatar avatar-lg" : "avatar";
  if (src) return <img className={cls} src={src} alt="" style={{ objectFit: "cover" }} />;
  return <span className={cls} aria-hidden="true">{initials(name)}</span>;
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="stars" aria-label={`${rating.toFixed(1)} out of 5`}>
        {"★".repeat(rounded)}{"☆".repeat(Math.max(0, 5 - rounded))}
      </span>
      <span className="small muted mono">{rating > 0 ? rating.toFixed(1) : "New"}{count ? ` (${count})` : ""}</span>
    </span>
  );
}

export function EmptyState({ icon = "📭", title, message, action }: { icon?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {message ? <p className="small">{message}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

export function Meter({ value }: { value: number }) {
  return <div className="meter"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function LinkButton({ href, children, variant = "", className = "" }: { href: string; children: ReactNode; variant?: string; className?: string }) {
  return <Link href={href} className={`btn ${variant} ${className}`}>{children}</Link>;
}

export function Skeleton({ height = 80 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} />;
}
