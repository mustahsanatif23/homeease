import Link from "next/link";
import { requireRole } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ProviderPendingPage() {
  const user = await requireRole("PROVIDER");
  if (user.verificationStatus === "APPROVED") {
    return (
      <main className="auth-main" style={{ minHeight: "100vh" }}>
        <div className="auth-card card center stack">
          <div style={{ fontSize: "2rem" }} aria-hidden="true">🎉</div>
          <h1>You&apos;re approved</h1>
          <p className="muted small">Your profile is live and you can start receiving jobs.</p>
          <Link href="/provider/dashboard" className="btn">Go to dashboard</Link>
        </div>
      </main>
    );
  }

  const rejected = user.verificationStatus === "REJECTED";
  return (
    <main className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-card card center stack">
        <div style={{ fontSize: "2rem" }} aria-hidden="true">{rejected ? "🚫" : "⏳"}</div>
        <h1>{rejected ? "Application declined" : "Verification in progress"}</h1>
        <p className="muted small">
          {rejected
            ? "Your provider application wasn't approved. Contact support if you'd like it reviewed again."
            : "An admin is reviewing your profile. You'll be notified the moment you're approved — then jobs start flowing in."}
        </p>
        <div className="card card-tight" style={{ textAlign: "left" }}>
          <div className="small strong">{user.businessName}</div>
          <div className="tiny muted">{user.email}</div>
          <div className="tiny muted">Status: {user.verificationStatus?.toLowerCase()}</div>
        </div>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <Link href="/" className="btn btn-secondary">Back to home</Link>
          <LogoutButton className="btn-ghost" />
        </div>
      </div>
    </main>
  );
}
