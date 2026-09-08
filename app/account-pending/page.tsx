import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AccountPendingPage() {
  return (
    <main className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-card card stack center">
        <div style={{ fontSize: "2rem" }} aria-hidden="true">⏳</div>
        <h1>Your account is under review</h1>
        <p className="muted small">
          An administrator is reviewing your details. You&apos;ll be notified as soon as your account is active.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 10 }}>
          <Link href="/" className="btn btn-secondary">Back to home</Link>
          <LogoutButton className="btn-ghost" />
        </div>
      </div>
    </main>
  );
}
