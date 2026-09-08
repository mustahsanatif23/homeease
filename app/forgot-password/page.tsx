import Link from "next/link";
import { Logo } from "@/components/Brand";
import type { Metadata } from "next";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <main className="auth-main" style={{ minHeight: "100vh" }}>
      <div className="auth-card stack">
        <Logo />
        <div>
          <h1>Reset your password</h1>
          <p className="muted small">Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <ForgotForm />
        <p className="small center muted"><Link href="/login" className="strong">Back to login</Link></p>
      </div>
    </main>
  );
}
