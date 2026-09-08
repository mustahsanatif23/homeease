"use client";

import { useActionState, useState } from "react";
import {
  approveProviderAction, setUserStatusAction, changeRoleAction, createUserAction,
  saveCategoryAction, saveServiceAction, saveMatchingConfigAction, adminBookingAction,
} from "@/actions/admin.actions";
import { initialActionState } from "@/actions/types";
import { Field, SubmitButton, FormAlert } from "@/components/forms";

export function VerificationForm({ providerId }: { providerId: string }) {
  const [state, formAction] = useActionState(approveProviderAction, initialActionState);
  return (
    <div className="stack-sm">
      <FormAlert error={state.error} />
      <div className="row" style={{ gap: 8 }}>
        <form action={formAction}>
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="status" value="APPROVED" />
          <SubmitButton className="btn-success btn-sm" pendingText="Approving…">Approve</SubmitButton>
        </form>
        <form action={formAction}>
          <input type="hidden" name="providerId" value={providerId} />
          <input type="hidden" name="status" value="REJECTED" />
          <input type="hidden" name="reason" value="Application did not meet verification requirements." />
          <SubmitButton className="btn-secondary btn-sm" pendingText="Rejecting…">Reject</SubmitButton>
        </form>
      </div>
    </div>
  );
}

export function AccountStatusForm({ userId, current }: { userId: string; current: string }) {
  const [state, formAction] = useActionState(setUserStatusAction, initialActionState);
  return (
    <form action={formAction} className="row" style={{ gap: 8 }}>
      <FormAlert error={state.error} />
      <input type="hidden" name="userId" value={userId} />
      <select name="accountStatus" className="select" defaultValue={current} style={{ width: 150 }} aria-label="Account status">
        <option value="ACTIVE">Active</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="DEACTIVATED">Deactivated</option>
      </select>
      <SubmitButton className="btn-secondary btn-sm" pendingText="Saving…">Update</SubmitButton>
    </form>
  );
}

export function RoleForm({ userId, current }: { userId: string; current: string }) {
  const [state, formAction] = useActionState(changeRoleAction, initialActionState);
  const [role, setRole] = useState(current);
  return (
    <form action={formAction} className="stack-sm">
      <FormAlert error={state.error} message={state.message} />
      <input type="hidden" name="userId" value={userId} />
      <div className="row" style={{ gap: 8 }}>
        <select name="role" className="select" value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 150 }} aria-label="Role">
          <option value="CUSTOMER">Customer</option>
          <option value="PROVIDER">Provider</option>
          <option value="ADMIN">Admin</option>
        </select>
        <SubmitButton className="btn-secondary btn-sm" pendingText="Saving…">Change role</SubmitButton>
      </div>
      {role === "ADMIN" ? (
        <label className="checkbox-row">
          <input type="checkbox" name="confirmAdmin" />
          <span className="tiny">I understand this grants full platform access.</span>
        </label>
      ) : null}
    </form>
  );
}

export function CreateUserForm({ areas }: { areas: string[] }) {
  const [state, formAction] = useActionState(createUserAction, initialActionState);
  const [role, setRole] = useState("CUSTOMER");
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      <Field label="Full name" name="name" required error={state.fieldErrors?.name} validate="name" maxLength={80} />
      <Field label="Email" name="email" type="email" required error={state.fieldErrors?.email} validate="email" />
      <Field label="Phone" name="phone" required error={state.fieldErrors?.phone} validate="phone" maxLength={16} />
      <Field label="Temporary password" name="password" required error={state.fieldErrors?.password} hint="At least 8 characters with a letter and a number." />
      <Field label="Address" name="address" required error={state.fieldErrors?.address} />
      <Field label="Area" name="area" error={state.fieldErrors?.area}>
        <select id="area" name="area" className="select">{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select>
      </Field>
      <Field label="Role" name="role" error={state.fieldErrors?.role}>
        <select id="role" name="role" className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="CUSTOMER">Customer</option>
          <option value="PROVIDER">Provider</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>
      {role === "ADMIN" ? (
        <label className="checkbox-row">
          <input type="checkbox" name="confirmAdmin" />
          <span className="tiny">Confirm: this account will have full admin access.</span>
        </label>
      ) : null}
      <SubmitButton pendingText="Creating…">Create account</SubmitButton>
    </form>
  );
}

export function CategoryForm({ category }: { category?: { id: string; name: string; description: string; icon: string; active: boolean } }) {
  const [state, formAction] = useActionState(saveCategoryAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <Field label="Name" name="name" defaultValue={category?.name} required error={state.fieldErrors?.name} />
      <Field label="Description" name="description" defaultValue={category?.description} required error={state.fieldErrors?.description} />
      <Field label="Icon (emoji)" name="icon" defaultValue={category?.icon ?? "🧰"} required error={state.fieldErrors?.icon} />
      <label className="checkbox-row">
        <input type="checkbox" name="active" defaultChecked={category?.active ?? true} />
        <span className="small">Visible to customers</span>
      </label>
      <SubmitButton pendingText="Saving…">{category ? "Update category" : "Create category"}</SubmitButton>
    </form>
  );
}

export function ServiceForm({ categories, service }: {
  categories: { id: string; name: string }[];
  service?: { id: string; categoryId: string; name: string; description: string; basePrice: number; estimatedDuration: number; active: boolean };
}) {
  const [state, formAction] = useActionState(saveServiceAction, initialActionState);
  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <Field label="Category" name="categoryId" error={state.fieldErrors?.categoryId}>
        <select id="categoryId" name="categoryId" className="select" defaultValue={service?.categoryId}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Name" name="name" defaultValue={service?.name} required error={state.fieldErrors?.name} />
      <Field label="Description" name="description" defaultValue={service?.description} required error={state.fieldErrors?.description} />
      <div className="grid grid-2">
        <Field label="Base price (৳)" name="basePrice" type="number" min={50} max={200000} defaultValue={service?.basePrice ?? 1000} required error={state.fieldErrors?.basePrice} />
        <Field label="Duration (minutes)" name="estimatedDuration" type="number" min={15} max={1440} defaultValue={service?.estimatedDuration ?? 90} required error={state.fieldErrors?.estimatedDuration} />
      </div>
      <label className="checkbox-row">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} />
        <span className="small">Bookable</span>
      </label>
      <SubmitButton pendingText="Saving…">{service ? "Update service" : "Create service"}</SubmitButton>
    </form>
  );
}

const WEIGHTS = [
  ["availabilityWeight", "Availability"], ["distanceWeight", "Distance"], ["ratingWeight", "Rating"],
  ["priceWeight", "Price"], ["expertiseWeight", "Expertise"], ["workloadWeight", "Workload"],
] as const;

export function MatchingConfigForm({ config }: { config: Record<string, number> }) {
  const [state, formAction] = useActionState(saveMatchingConfigAction, initialActionState);
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(WEIGHTS.map(([key]) => [key, config[key] ?? 0])),
  );
  const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <form action={formAction} className="stack">
      <FormAlert error={state.error} message={state.message} />
      {WEIGHTS.map(([key, label]) => (
        <div key={key} className="stack-sm">
          <div className="row-between">
            <label className="label" htmlFor={key} style={{ margin: 0 }}>{label}</label>
            <span className="mono small strong">{weights[key]}%</span>
          </div>
          <input
            id={key} name={key} type="range" min={0} max={60} step={1}
            value={weights[key]}
            onChange={(e) => setWeights((current) => ({ ...current, [key]: Number(e.target.value) }))}
          />
        </div>
      ))}

      <div className={`alert ${Math.abs(total - 100) < 0.01 ? "alert-success" : "alert-warning"}`}>
        Total: <strong>{total}%</strong> {Math.abs(total - 100) < 0.01 ? "— ready to save." : "— the six weights must total exactly 100%."}
      </div>

      <div className="grid grid-2">
        <Field label="Urgent distance multiplier" name="urgencyDistanceMultiplier" type="number" step="0.1" defaultValue={config.urgencyDistanceMultiplier} error={state.fieldErrors?.urgencyDistanceMultiplier} />
        <Field label="Urgent availability multiplier" name="urgencyAvailabilityMultiplier" type="number" step="0.1" defaultValue={config.urgencyAvailabilityMultiplier} error={state.fieldErrors?.urgencyAvailabilityMultiplier} />
        <Field label="Service fee (%)" name="serviceFeePercent" type="number" defaultValue={config.serviceFeePercent} error={state.fieldErrors?.serviceFeePercent} />
        <Field label="Urgency fee (%)" name="urgencyFeePercent" type="number" defaultValue={config.urgencyFeePercent} error={state.fieldErrors?.urgencyFeePercent} />
        <Field label="Distance fee per km (৳)" name="distanceFeePerKm" type="number" defaultValue={config.distanceFeePerKm} error={state.fieldErrors?.distanceFeePerKm} />
      </div>

      <SubmitButton pendingText="Saving…" disabled={Math.abs(total - 100) >= 0.01}>Save configuration</SubmitButton>
    </form>
  );
}

export function AdminBookingActions({ bookingId, invoiceId, canCancel }: { bookingId: string; invoiceId?: string; canCancel: boolean }) {
  const [state, formAction] = useActionState(adminBookingAction, initialActionState);
  return (
    <div className="row" style={{ gap: 6 }}>
      <FormAlert error={state.error} />
      {canCancel ? (
        <form action={formAction}>
          <input type="hidden" name="intent" value="cancel" />
          <input type="hidden" name="bookingId" value={bookingId} />
          <SubmitButton className="btn-ghost btn-sm" pendingText="…">Cancel</SubmitButton>
        </form>
      ) : null}
      {invoiceId ? (
        <form action={formAction}>
          <input type="hidden" name="intent" value="mark-paid" />
          <input type="hidden" name="bookingId" value={bookingId} />
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <SubmitButton className="btn-secondary btn-sm" pendingText="…">Mark paid</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
