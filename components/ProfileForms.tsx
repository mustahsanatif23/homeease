"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction } from "@/actions/auth.actions";
import { initialActionState } from "@/actions/types";
import { Field, PasswordField, SubmitButton, FormAlert } from "@/components/forms";

export function ProfileForm({ user, areas }: { user: { name: string; phone: string | null; address: string | null; area: string | null }; areas: string[] }) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <Field label="Full name" name="name" defaultValue={user.name} required error={state.fieldErrors?.name} validate="name" maxLength={80} />
      <Field label="Phone" name="phone" defaultValue={user.phone ?? ""} required error={state.fieldErrors?.phone} validate="phone" maxLength={16} />
      <Field label="Address" name="address" defaultValue={user.address ?? ""} required error={state.fieldErrors?.address} />
      <Field label="Area" name="area" error={state.fieldErrors?.area}>
        <select name="area" id="area" className="select" defaultValue={user.area ?? areas[0]}>
          {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
      </Field>
      <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <PasswordField label="Current password" name="currentPassword" error={state.fieldErrors?.currentPassword} autoComplete="current-password" />
      <PasswordField label="New password" name="password" error={state.fieldErrors?.password} autoComplete="new-password" check hint="At least 8 characters with a letter and a number." />
      <PasswordField label="Confirm new password" name="confirmPassword" error={state.fieldErrors?.confirmPassword} autoComplete="new-password" />
      <SubmitButton pendingText="Updating…">Change password</SubmitButton>
    </form>
  );
}
