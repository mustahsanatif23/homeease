"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton, FormAlert } from "@/components/forms";
import { checkField } from "@/lib/validation";

const DEMOS = [
  { label: "Demo Customer", email: "customer@homeease.demo" },
  { label: "Demo Provider", email: "provider@homeease.demo" },
];

export default function LoginForm({ next, reset }: { next?: string; reset?: boolean }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");

  return (
    <form action={formAction} className="stack">
      {reset ? <div className="alert alert-success">Password updated. Please log in.</div> : null}
      <FormAlert error={state.error} />
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="field">
        <label className="label" htmlFor="email">Email *</label>
        <input
          id="email" name="email" type="email" required autoComplete="email" inputMode="email"
          className={`input ${emailError ? "input-error" : ""}`}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          value={email}
          onChange={(e) => { setEmail(e.target.value.replace(/\s/g, "")); if (emailError) setEmailError(checkField("email", e.target.value)); }}
          onBlur={() => setEmailError(checkField("email", email))}
          placeholder="you@example.com"
        />
        {emailError ? <span className="error-text" id="email-error" role="alert">{emailError}</span> : null}
      </div>

      <div className="field">
        <label className="label" htmlFor="password">Password *</label>
        <input
          id="password" name="password" type="password" required autoComplete="current-password"
          className="input" value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="row-between">
        <label className="checkbox-row"><input type="checkbox" name="remember" /> Keep me signed in</label>
        <Link href="/forgot-password" className="small">Forgot password?</Link>
      </div>

      <SubmitButton className="btn-block btn-lg" pendingText="Signing in…">Log in</SubmitButton>

      <div className="row" style={{ gap: 10 }}>
        <hr style={{ flex: 1, border: 0, borderTop: "1px solid var(--border)" }} />
        <span className="tiny muted">Demo accounts</span>
        <hr style={{ flex: 1, border: 0, borderTop: "1px solid var(--border)" }} />
      </div>

      <div className="row" style={{ gap: 8 }}>
        {DEMOS.map((demo) => (
          <button
            key={demo.email} type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }}
            onClick={() => { setEmail(demo.email); setPassword("Password123"); setEmailError(""); }}
          >
            {demo.label}
          </button>
        ))}
      </div>
      <p className="tiny muted center">Development demo credentials — password <code>Password123</code>.</p>

      <p className="small center muted">
        New to HomeEase? <Link href="/register" className="strong">Create an account</Link>
      </p>
    </form>
  );
}
