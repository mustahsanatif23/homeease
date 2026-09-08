"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerCustomerAction, registerProviderAction } from "@/actions/auth.actions";
import { initialActionState } from "@/actions/types";
import { Field, PasswordField, SubmitButton, FormAlert } from "@/components/forms";

interface ServiceOption { id: string; name: string; categoryName: string }

export default function RegisterForm({ areas, services, initialRole }: { areas: string[]; services: ServiceOption[]; initialRole: "customer" | "provider" }) {
  const [role, setRole] = useState<"customer" | "provider">(initialRole);
  const [customerState, customerAction] = useActionState(registerCustomerAction, initialActionState);
  const [providerState, providerAction] = useActionState(registerProviderAction, initialActionState);
  const state = role === "customer" ? customerState : providerState;
  const errors = state.fieldErrors ?? {};

  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        {(["customer", "provider"] as const).map((option) => (
          <button
            key={option} type="button" onClick={() => setRole(option)}
            className={`btn ${role === option ? "" : "btn-secondary"}`} style={{ flex: 1 }}
            aria-pressed={role === option}
          >
            {option === "customer" ? "I need a service" : "I provide services"}
          </button>
        ))}
      </div>

      <FormAlert error={state.error} />

      {role === "customer" ? (
        <form action={customerAction} className="stack">
          <Field label="Full name" name="name" required error={errors.name} autoComplete="name" validate="name" maxLength={80} hint="Letters only." />
          <Field label="Email" name="email" type="email" required error={errors.email} autoComplete="email" validate="email" />
          <Field label="Phone" name="phone" required error={errors.phone} placeholder="01712345678" autoComplete="tel" validate="phone" maxLength={16} hint="Digits only, 11–15 of them." />
          <PasswordField label="Password" name="password" error={errors.password} autoComplete="new-password" check hint="At least 8 characters with a letter and a number." />
          <PasswordField label="Confirm password" name="confirmPassword" error={errors.confirmPassword} autoComplete="new-password" />
          <Field label="Address" name="address" required error={errors.address} placeholder="House, road, area" />
          <Field label="Area" name="area" required error={errors.area}>
            <select name="area" id="area" className="select" defaultValue={areas[0]}>
              {areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </Field>
          <label className="checkbox-row"><input type="checkbox" name="terms" /> I accept the terms of service and privacy policy.</label>
          {errors.terms ? <span className="error-text">{errors.terms}</span> : null}
          <SubmitButton className="btn-block btn-lg" pendingText="Creating account…">Create customer account</SubmitButton>
        </form>
      ) : (
        <form action={providerAction} className="stack">
          <Field label="Full name" name="name" required error={errors.name} autoComplete="name" validate="name" maxLength={80} hint="Letters only." />
          <Field label="Business name" name="businessName" required error={errors.businessName} />
          <Field label="Email" name="email" type="email" required error={errors.email} autoComplete="email" validate="email" />
          <Field label="Phone" name="phone" required error={errors.phone} placeholder="01712345678" autoComplete="tel" validate="phone" maxLength={16} hint="Digits only, 11–15 of them." />
          <PasswordField label="Password" name="password" error={errors.password} autoComplete="new-password" check hint="At least 8 characters with a letter and a number." />
          <PasswordField label="Confirm password" name="confirmPassword" error={errors.confirmPassword} autoComplete="new-password" />
          <Field label="Address" name="address" required error={errors.address} />
          <div className="grid grid-2">
            <Field label="Service area" name="area" required error={errors.area}>
              <select name="area" id="area" className="select" defaultValue={areas[0]}>
                {areas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </Field>
            <Field label="Service radius (km)" name="serviceRadiusKm" type="number" min={1} max={50} defaultValue={12} error={errors.serviceRadiusKm} />
          </div>
          <Field label="Years of experience" name="experienceYears" type="number" min={0} max={50} defaultValue={3} required error={errors.experienceYears} />

          <div className="field">
            <span className="label">Services you offer *</span>
            <div className="card card-tight" style={{ maxHeight: 210, overflowY: "auto" }}>
              {services.map((service) => (
                <label key={service.id} className="checkbox-row" style={{ padding: "3px 0" }}>
                  <input type="checkbox" name="serviceIds[]" value={service.id} />
                  <span>{service.name} <span className="tiny muted">· {service.categoryName}</span></span>
                </label>
              ))}
            </div>
            {errors.serviceIds ? <span className="error-text">{errors.serviceIds}</span> : null}
          </div>

          <div className="alert alert-info">
            New provider accounts are reviewed by an admin before they can receive jobs.
          </div>
          <label className="checkbox-row"><input type="checkbox" name="terms" /> I accept the provider terms and agree to verification.</label>
          {errors.terms ? <span className="error-text">{errors.terms}</span> : null}
          <SubmitButton className="btn-block btn-lg" pendingText="Submitting…">Apply as provider</SubmitButton>
        </form>
      )}

      <p className="small center muted">Already have an account? <Link href="/login" className="strong">Log in</Link></p>
    </div>
  );
}
