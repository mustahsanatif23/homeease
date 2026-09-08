import { ZodError, type ZodSchema } from "zod";
import type { ActionState } from "@/actions/types";

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Parses FormData with a Zod schema and returns UI-ready errors. */
export function parseForm<T>(schema: ZodSchema<T>, formData: FormData): { data?: T; state?: ActionState } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.endsWith("[]")) {
      const name = key.slice(0, -2);
      (raw[name] as unknown[]) = [...((raw[name] as unknown[]) ?? []), value];
    } else if (value !== "") {
      raw[key] = value;
    }
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { state: { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) } };
  }
  return { data: parsed.data };
}
