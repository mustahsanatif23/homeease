"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseForm } from "@/lib/form";
import { adminUserSchema, matchingConfigSchema, categorySchema, serviceSchema, rescheduleSchema } from "@/schemas";
import { setVerification } from "@/services/provider.service";
import { adminCreateUser, setAccountStatus, changeRole } from "@/services/user.service";
import { updateMatchingConfig, RECOMMENDED_CONFIG } from "@/services/config.service";
import { transitionBooking, rescheduleBooking, createBooking } from "@/services/booking.service";
import { recordAudit } from "@/services/audit.service";
import { markInvoicePaid } from "@/services/invoice.service";
import { toUserMessage } from "@/lib/errors";
import type { AccountStatus, Role, VerificationStatus } from "@/lib/constants";
import type { ActionState } from "@/actions/types";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function approveProviderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const providerId = String(formData.get("providerId") ?? "");
  const status = String(formData.get("status") ?? "APPROVED") as VerificationStatus;
  try {
    await setVerification({
      providerId,
      status,
      adminId: admin.id,
      reason: String(formData.get("reason") ?? "") || undefined,
    });
    revalidatePath("/admin/providers");
    revalidatePath("/admin");
    return { ok: true, message: `Provider ${status.toLowerCase()}.` };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function setUserStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  try {
    await setAccountStatus({
      userId: String(formData.get("userId") ?? ""),
      status: String(formData.get("accountStatus") ?? "ACTIVE") as AccountStatus,
      adminId: admin.id,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Account updated." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function changeRoleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const role = String(formData.get("role") ?? "") as Role;
  if (role === "ADMIN" && formData.get("confirmAdmin") !== "on") {
    return { ok: false, error: "Tick the confirmation box to grant admin access." };
  }
  try {
    await changeRole({ userId: String(formData.get("userId") ?? ""), role, adminId: admin.id });
    revalidatePath("/admin/users");
    return { ok: true, message: "Role updated." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function createUserAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const { data, state } = parseForm(adminUserSchema, formData);
  if (!data) return state!;
  if (data.role === "ADMIN" && !data.confirmAdmin) {
    return { ok: false, error: "Tick the confirmation box to create an admin account." };
  }
  try {
    await adminCreateUser({ ...data, adminId: admin.id });
    revalidatePath("/admin/users");
    return { ok: true, message: `${data.role.toLowerCase()} account created.` };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function saveCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const { data, state } = parseForm(categorySchema, formData);
  if (!data) return state!;
  try {
    if (data.id) {
      await prisma.serviceCategory.update({
        where: { id: data.id },
        data: { name: data.name, description: data.description, icon: data.icon, active: data.active },
      });
    } else {
      await prisma.serviceCategory.create({
        data: { name: data.name, slug: slugify(data.name), description: data.description, icon: data.icon, active: data.active },
      });
    }
    await recordAudit({ userId: admin.id, action: "CATEGORY_SAVED", entity: "ServiceCategory", entityId: data.id });
    revalidatePath("/admin/categories");
    revalidatePath("/services");
    return { ok: true, message: "Category saved." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function saveServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const { data, state } = parseForm(serviceSchema, formData);
  if (!data) return state!;
  try {
    if (data.id) {
      await prisma.service.update({
        where: { id: data.id },
        data: {
          categoryId: data.categoryId, name: data.name, description: data.description,
          basePrice: data.basePrice, estimatedDuration: data.estimatedDuration, active: data.active,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          categoryId: data.categoryId, name: data.name, slug: slugify(data.name), description: data.description,
          basePrice: data.basePrice, estimatedDuration: data.estimatedDuration, active: data.active,
        },
      });
    }
    await recordAudit({ userId: admin.id, action: "SERVICE_SAVED", entity: "Service", entityId: data.id });
    revalidatePath("/admin/services");
    revalidatePath("/services");
    revalidatePath("/book");
    return { ok: true, message: "Service saved." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function toggleServiceAction(serviceId: string): Promise<void> {
  const admin = await requireRole("ADMIN");
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return;
  await prisma.service.update({ where: { id: serviceId }, data: { active: !service.active } });
  await recordAudit({ userId: admin.id, action: "SERVICE_TOGGLED", entity: "Service", entityId: serviceId });
  revalidatePath("/admin/services");
}

export async function saveMatchingConfigAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const { data, state } = parseForm(matchingConfigSchema, formData);
  if (!data) return state!;
  try {
    await updateMatchingConfig(data);
    await recordAudit({ userId: admin.id, action: "MATCHING_CONFIG_UPDATED", entity: "MatchingConfiguration", entityId: "default", metadata: data });
    revalidatePath("/admin/matching");
    return { ok: true, message: "Matching configuration saved." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function resetMatchingConfigAction(): Promise<void> {
  const admin = await requireRole("ADMIN");
  await updateMatchingConfig(RECOMMENDED_CONFIG);
  await recordAudit({ userId: admin.id, action: "MATCHING_CONFIG_RESET", entity: "MatchingConfiguration", entityId: "default" });
  revalidatePath("/admin/matching");
}

export async function adminBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const intent = String(formData.get("intent") ?? "");
  const bookingId = String(formData.get("bookingId") ?? "");
  try {
    if (intent === "cancel") {
      await transitionBooking({ bookingId, to: "CANCELLED", actorId: admin.id, actorRole: "ADMIN", reason: "Cancelled by admin" });
    } else if (intent === "reschedule") {
      const { data, state } = parseForm(rescheduleSchema, formData);
      if (!data) return state!;
      await rescheduleBooking({ ...data, actorId: admin.id, actorRole: "ADMIN" });
    } else if (intent === "reassign") {
      const providerId = String(formData.get("providerId") ?? "");
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return { ok: false, error: "We couldn't find that booking." };
      await transitionBooking({ bookingId, to: "CANCELLED", actorId: admin.id, actorRole: "ADMIN", reason: "Reassigned by admin" });
      await createBooking({ requestId: booking.requestId, providerId, actorRole: "ADMIN", actorId: admin.id });
    } else if (intent === "mark-paid") {
      const invoiceId = String(formData.get("invoiceId") ?? "");
      await markInvoicePaid(invoiceId);
    }
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/invoices");
    return { ok: true, message: "Done." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
