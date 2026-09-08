"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseForm } from "@/lib/form";
import { serviceRequestSchema, reviewSchema } from "@/schemas";
import { createServiceRequest, matchRequest, cancelRequest, autoAssign } from "@/services/request.service";
import { createBooking, transitionBooking } from "@/services/booking.service";
import { createReview } from "@/services/review.service";
import { markAllRead, markRead } from "@/services/notification.service";
import { saveImage } from "@/lib/storage";
import { toUserMessage } from "@/lib/errors";
import type { ActionState } from "@/actions/types";

export async function uploadImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("CUSTOMER");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image first." };
  const { url, error } = await saveImage(file);
  if (error) return { ok: false, error };
  return { ok: true, data: { url: url! } };
}

export async function createRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const { data, state } = parseForm(serviceRequestSchema, formData);
  if (!data) return state!;

  let requestId: string;
  try {
    const request = await createServiceRequest(user.id, data);
    requestId = request.id;
    if (data.autoAssign) {
      await autoAssign(request.id);
    } else {
      await matchRequest(request.id);
    }
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect(`/requests/${requestId}/match`);
}

export async function rematchAction(requestId: string): Promise<void> {
  const user = await requireRole("CUSTOMER");
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { customerId: true } });
  if (request?.customerId !== user.id) return;
  await matchRequest(requestId);
  revalidatePath(`/requests/${requestId}/match`);
}

export async function selectProviderAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const requestId = String(formData.get("requestId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  const startTime = String(formData.get("startTime") ?? "") || undefined;
  if (!requestId || !providerId) return { ok: false, error: "Choose a provider to continue." };

  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId }, select: { customerId: true } });
  if (!request || request.customerId !== user.id) return { ok: false, error: "You don't have access to that request." };

  try {
    await createBooking({ requestId, providerId, actorRole: "CUSTOMER", actorId: user.id, startTime });
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
  redirect(`/requests/${requestId}`);
}

export async function cancelRequestAction(requestId: string): Promise<void> {
  const user = await requireRole("CUSTOMER");
  await cancelRequest(requestId, user.id).catch(() => undefined);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
}

export async function cancelBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const bookingId = String(formData.get("bookingId") ?? "");
  try {
    await transitionBooking({
      bookingId,
      to: "CANCELLED",
      actorId: user.id,
      actorRole: "CUSTOMER",
      reason: String(formData.get("reason") ?? "Cancelled by customer"),
    });
    revalidatePath("/bookings");
    return { ok: true, message: "Booking cancelled." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function reviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("CUSTOMER");
  const { data, state } = parseForm(reviewSchema, formData);
  if (!data) return state!;
  try {
    await createReview(user.id, data);
    revalidatePath("/history");
    return { ok: true, message: "Thanks for the review!" };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function toggleFavoriteAction(providerId: string): Promise<void> {
  const user = await requireRole("CUSTOMER");
  const existing = await prisma.favoriteProvider.findUnique({
    where: { customerId_providerId: { customerId: user.id, providerId } },
  });
  if (existing) {
    await prisma.favoriteProvider.delete({ where: { id: existing.id } });
  } else {
    await prisma.favoriteProvider.create({ data: { customerId: user.id, providerId } });
  }
  revalidatePath("/favorites");
}

export async function markNotificationAction(notificationId: string): Promise<void> {
  const user = await requireRole(["CUSTOMER", "PROVIDER", "ADMIN"]);
  await markRead(user.id, notificationId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsAction(): Promise<void> {
  const user = await requireRole(["CUSTOMER", "PROVIDER", "ADMIN"]);
  await markAllRead(user.id);
  revalidatePath("/notifications");
}
