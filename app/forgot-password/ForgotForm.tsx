"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth.actions";
import { initialActionState } from "@/actions/types";
import { Field, SubmitButton, FormAlert } from "@/components/forms";

export default function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialActionState);
  const devLink = state.data?.devLink as string | undefined;

  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <Field label="Email" name="email" type="email" required error={state.fieldErrors?.email} autoComplete="email" />
      <SubmitButton className="btn-block" pendingText="Sending…">Send reset link</SubmitButton>
      {devLink ? (
        <div className="alert alert-info">
          <strong>Development mode:</strong> no email provider is configured, so use this link directly.
          <div style={{ marginTop: 8 }}>
            <Link href={devLink.replace(/^https?:\/\/[^/]+/, "")} className="btn btn-sm btn-secondary">Open reset link</Link>
          </div>
        </div>
      ) : null}
    </form>
  );
}
