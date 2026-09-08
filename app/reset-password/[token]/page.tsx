import Link from "next/link";
import { Logo } from "@/components/Brand";
import type { Metadata } from "next";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-card stack">
        <Logo />
        <div>
          <h1>Set a new password</h1>
          <p className="muted small">Reset links expire after one hour and can only be used once.</p>
        </div>
        <ResetForm token={token} />
      </div>
    </main>
  );
}
