"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth.actions";
import { initialActionState } from "@/actions/types";
import { PasswordField, SubmitButton, FormAlert } from "@/components/forms";

export default function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} />
      <input type="hidden" name="token" value={token} />
      <PasswordField label="New password" name="password" error={state.fieldErrors?.password} autoComplete="new-password" hint="At least 8 characters with a letter and a number." />
      <PasswordField label="Confirm password" name="confirmPassword" error={state.fieldErrors?.confirmPassword} autoComplete="new-password" />
      <SubmitButton className="btn-block" pendingText="Saving…">Update password</SubmitButton>
    </form>
  );
}
