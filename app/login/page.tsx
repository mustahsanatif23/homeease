import Link from "next/link";
import { Logo } from "@/components/Brand";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const params = await searchParams;

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Logo />
        <div>
          <h2 style={{ fontSize: "1.8rem" }}>Home services, handled intelligently.</h2>
          <p>Smart matching, instant scheduling and live tracking — from request to invoice.</p>
          <ul style={{ marginTop: 20 }}>
            <li><span aria-hidden="true">✓</span> Ranked provider recommendations with a visible score</li>
            <li><span aria-hidden="true">✓</span> Real availability — never book a busy provider</li>
            <li><span aria-hidden="true">✓</span> Track every stage and get an automatic invoice</li>
          </ul>
        </div>
        <p className="tiny muted">BAUST CSE FEST 2026 · Hackathon build</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card stack">
          <div className="row-between">
            <Link href="/" className="btn btn-ghost btn-sm">← Main site</Link>
            <Logo href="/" height={24} />
          </div>
          <div>
            <h1>Welcome back</h1>
            <p className="muted small">Log in to book, manage and track your services.</p>
          </div>
          <LoginForm next={params.next} reset={params.reset === "1"} />
        </div>
      </main>
    </div>
  );
}
