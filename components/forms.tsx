"use client";

import { useFormStatus } from "react-dom";
import { useState, type ReactNode } from "react";
import { checkField, sanitize } from "@/lib/validation";

export function SubmitButton({ children, className = "", pendingText, ...rest }: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn ${className}`} {...rest} disabled={pending || rest.disabled}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}

export type ValidationKind = "name" | "phone" | "email" | "digits";

/**
 * A labelled input. When `validate` is set the value is filtered as the user
 * types (letters-only for names, digits for phones and numbers) and checked on
 * blur, so mistakes are caught before the form is ever submitted. The same
 * rules run again on the server in schemas/index.ts.
 */
export function Field({
  label, name, type = "text", error, hint, defaultValue, required, placeholder, children,
  autoComplete, min, max, step, validate, maxLength,
}: {
  label: string; name: string; type?: string; error?: string; hint?: string;
  defaultValue?: string | number; required?: boolean; placeholder?: string; children?: ReactNode; autoComplete?: string;
  min?: string | number; max?: string | number; step?: string | number;
  validate?: ValidationKind; maxLength?: number;
}) {
  const [value, setValue] = useState(defaultValue === undefined ? "" : String(defaultValue));
  const [localError, setLocalError] = useState("");
  const shown = error || localError;

  const controlled = validate
    ? {
        value,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const next = validate === "email" ? event.target.value : sanitize(validate, event.target.value);
          setValue(next);
          if (localError) setLocalError(checkField(validate, next, Boolean(required)));
        },
        onBlur: () => setLocalError(checkField(validate, value, Boolean(required))),
        inputMode: (validate === "phone" || validate === "digits" ? "numeric" : validate === "email" ? "email" : "text") as "numeric" | "email" | "text",
      }
    : { defaultValue };

  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label}{required ? " *" : ""}</label>
      {children ?? (
        <input
          id={name} name={name} type={type} placeholder={placeholder} maxLength={maxLength}
          autoComplete={autoComplete} required={required} min={min} max={max} step={step}
          className={`input ${shown ? "input-error" : ""}`}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${name}-error` : undefined}
          {...controlled}
        />
      )}
      {hint && !shown ? <span className="hint">{hint}</span> : null}
      {shown ? <span className="error-text" id={`${name}-error`} role="alert">{shown}</span> : null}
    </div>
  );
}

export function PasswordField({ label, name, error, autoComplete, hint, check = false }: { label: string; name: string; error?: string; autoComplete?: string; hint?: string; check?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [localError, setLocalError] = useState("");
  return (
    <div className="field">
      <label className="label" htmlFor={name}>{label} *</label>
      <div style={{ position: "relative" }}>
        <input
          id={name} name={name} type={visible ? "text" : "password"} required autoComplete={autoComplete}
          className={`input ${error || localError ? "input-error" : ""}`} style={{ paddingRight: 62 }}
          aria-describedby={error || localError ? `${name}-error` : undefined}
          onBlur={check ? (event) => setLocalError(event.target.value ? checkField("password", event.target.value) : "") : undefined}
          onChange={check && localError ? (event) => setLocalError(event.target.value ? checkField("password", event.target.value) : "") : undefined}
        />
        <button
          type="button" onClick={() => setVisible((v) => !v)}
          className="btn btn-ghost btn-sm"
          style={{ position: "absolute", right: 4, top: 4, padding: "4px 8px" }}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && !error && !localError ? <span className="hint">{hint}</span> : null}
      {error || localError ? <span className="error-text" id={`${name}-error`} role="alert">{error || localError}</span> : null}
    </div>
  );
}

export function FormAlert({ error, message }: { error?: string; message?: string }) {
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (message) return <div className="alert alert-success" role="status">{message}</div>;
  return null;
}

export function ConfirmButton({ children, action, className = "", confirmText = "Are you sure?" }: { children: ReactNode; action: () => Promise<void>; className?: string; confirmText?: string }) {
  return (
    <form
      action={action}
      onSubmit={(event) => { if (!window.confirm(confirmText)) event.preventDefault(); }}
      style={{ display: "inline" }}
    >
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
