/**
 * Shared validation rules. Imported by both the Zod schemas (server) and the
 * form fields (browser), so a value can never pass in one place and fail in the
 * other with a different message.
 */

export const PATTERNS = {
  /** Letters, spaces and the punctuation that appears in real names. No digits. */
  name: /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s.'-]*$/,
  /** Digits, with an optional leading +. 11–15 digits once separators are removed. */
  phone: /^\+?[0-9]{11,15}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
  /** Whole numbers only. */
  digits: /^[0-9]+$/,
};

export const MESSAGES = {
  name: "Use letters only — no numbers or symbols.",
  phone: "Enter a valid phone number: digits only, 11–15 of them (e.g. 01712345678).",
  email: "Enter a valid email address, like you@example.com.",
  digits: "Numbers only.",
  password: "At least 8 characters, including a letter and a number.",
};

/** Strips characters the field can never contain, as the user types. */
export function sanitize(kind: "name" | "phone" | "digits" | "email", value: string): string {
  switch (kind) {
    case "name":
      return value.replace(/[^A-Za-z\u00C0-\u024F\s.'-]/g, "");
    case "phone":
      return value.replace(/[^0-9+]/g, "").replace(/(?!^)\+/g, "");
    case "digits":
      return value.replace(/[^0-9]/g, "");
    default:
      return value.replace(/\s/g, "");
  }
}

/** Returns an error message, or "" when the value is acceptable. */
export function checkField(kind: "name" | "phone" | "digits" | "email" | "password", value: string, required = true): string {
  const trimmed = value.trim();
  if (!trimmed) return required ? "This field is required." : "";
  if (kind === "password") {
    if (trimmed.length < 8 || !/[a-zA-Z]/.test(trimmed) || !/[0-9]/.test(trimmed)) return MESSAGES.password;
    return "";
  }
  if (kind === "name" && (!PATTERNS.name.test(trimmed) || trimmed.length < 2)) return MESSAGES.name;
  if (kind === "phone" && !PATTERNS.phone.test(trimmed)) return MESSAGES.phone;
  if (kind === "email" && !PATTERNS.email.test(trimmed)) return MESSAGES.email;
  if (kind === "digits" && !PATTERNS.digits.test(trimmed)) return MESSAGES.digits;
  return "";
}
