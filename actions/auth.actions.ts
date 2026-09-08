"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  loginSchema, customerRegisterSchema, providerRegisterSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, profileSchema,
} from "@/schemas";
import { parseForm } from "@/lib/form";
import { createSession, destroySession } from "@/lib/session";
import { getCurrentUser, homeFor, requireAuth } from "@/lib/auth";
import { authenticate, registerCustomer, registerProvider, requestPasswordReset, resetPassword, changePassword } from "@/services/auth.service";
import { updateProfile } from "@/services/user.service";
import { rateLimit } from "@/lib/rate-limit";
import { toUserMessage } from "@/lib/errors";
import type { ActionState } from "@/actions/types";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data, state } = parseForm(loginSchema, formData);
  if (!data) return state!;

  const limit = rateLimit(`login:${data.email}`, 8, 60_000);
  if (!limit.ok) return { ok: false, error: `Too many attempts. Try again in ${limit.retryInSeconds}s.` };

  let destination = "/dashboard";
  try {
    const user = await authenticate(data.email, data.password);
    const agent = (await headers()).get("user-agent") ?? undefined;
    await createSession(user.id, data.remember, agent);
    destination = data.next && data.next.startsWith("/") ? data.next : homeFor(user.role);
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function registerCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data, state } = parseForm(customerRegisterSchema, formData);
  if (!data) return state!;
  try {
    const user = await registerCustomer(data);
    await createSession(user.id);
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect("/dashboard");
}

export async function registerProviderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data, state } = parseForm(providerRegisterSchema, formData);
  if (!data) return state!;
  try {
    const user = await registerProvider(data);
    await createSession(user.id);
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect("/provider/pending");
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data, state } = parseForm(forgotPasswordSchema, formData);
  if (!data) return state!;

  const limit = rateLimit(`forgot:${data.email}`, 5, 300_000);
  if (!limit.ok) return { ok: false, error: "Too many requests. Please try again later." };

  const result = await requestPasswordReset(data.email);
  return {
    ok: true,
    message: "If an account exists for that email, we've sent a reset link.",
    data: result.devLink ? { devLink: result.devLink } : undefined,
  };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { data, state } = parseForm(resetPasswordSchema, formData);
  if (!data) return state!;
  try {
    await resetPassword(data.token, data.password);
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect("/login?reset=1");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Please log in again." };
  const { data, state } = parseForm(changePasswordSchema, formData);
  if (!data) return state!;
  try {
    await changePassword(user.id, data.currentPassword, data.password);
    return { ok: true, message: "Password updated." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAuth();
  const { data, state } = parseForm(profileSchema, formData);
  if (!data) return state!;
  try {
    await updateProfile(user.id, data);
    revalidatePath("/profile");
    return { ok: true, message: "Profile saved." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
