import Link from "next/link";
import { Logo } from "@/components/Brand";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listServices } from "@/services/catalog.service";
import { AREAS } from "@/lib/constants";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const params = await searchParams;
  const services = await listServices();

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Logo />
        <div>
          <h2 style={{ fontSize: "1.8rem" }}>Join HomeEase</h2>
          <p>Book trusted professionals in minutes, or grow your service business with matched jobs.</p>
          <ul style={{ marginTop: 20 }}>
            <li><span aria-hidden="true">✓</span> Customers: smart matching and live tracking</li>
            <li><span aria-hidden="true">✓</span> Providers: jobs matched to your skills and area</li>
            <li><span aria-hidden="true">✓</span> Transparent pricing and automatic invoices</li>
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
            <h1>Create your account</h1>
            <p className="muted small">It takes less than a minute.</p>
          </div>
          <RegisterForm
            areas={AREAS.map((a) => a.name)}
            services={services.map((s) => ({ id: s.id, name: s.name, categoryName: s.category.name }))}
            initialRole={params.role === "provider" ? "provider" : "customer"}
          />
        </div>
      </main>
    </div>
  );
}
