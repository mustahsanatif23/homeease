"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseForm } from "@/lib/form";
import { timeOffSchema, providerServiceSchema, rescheduleSchema } from "@/schemas";
import { transitionBooking, rescheduleBooking } from "@/services/booking.service";
import { matchRequest } from "@/services/request.service";
import { toDateOnly } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import type { BookingStatus } from "@/lib/constants";
import type { ActionState } from "@/actions/types";

export async function updateJobStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROVIDER");
  const bookingId = String(formData.get("bookingId") ?? "");
  const to = String(formData.get("status") ?? "") as BookingStatus;
  try {
    await transitionBooking({ bookingId, to, actorId: user.id, actorRole: "PROVIDER" });
    // A declined job is immediately re-matched to the next best provider.
    if (to === "REJECTED") {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { requestId: true } });
      if (booking) await matchRequest(booking.requestId).catch(() => undefined);
    }
    revalidatePath("/provider/dashboard");
    revalidatePath("/provider/bookings");
    return { ok: true, message: "Job updated." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function providerRescheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROVIDER");
  const { data, state } = parseForm(rescheduleSchema, formData);
  if (!data) return state!;
  try {
    await rescheduleBooking({ ...data, actorId: user.id, actorRole: "PROVIDER" });
    revalidatePath("/provider/bookings");
    return { ok: true, message: "Booking rescheduled." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function saveAvailabilityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) return { ok: false, error: "Provider profile not found." };

  try {
    const updates = Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      startTime: String(formData.get(`start-${day}`) ?? "09:00"),
      endTime: String(formData.get(`end-${day}`) ?? "18:00"),
      isAvailable: formData.get(`active-${day}`) === "on",
    }));
    for (const u of updates) {
      if (u.startTime >= u.endTime) return { ok: false, error: "Start time must be before end time." };
    }
    await prisma.$transaction(
      updates.map((u) =>
        prisma.providerAvailability.upsert({
          where: { providerId_dayOfWeek: { providerId: user.providerId!, dayOfWeek: u.dayOfWeek } },
          create: { providerId: user.providerId!, ...u },
          update: u,
        }),
      ),
    );
    revalidatePath("/provider/calendar");
    return { ok: true, message: "Working hours saved." };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function addTimeOffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) return { ok: false, error: "Provider profile not found." };
  const { data, state } = parseForm(timeOffSchema, formData);
  if (!data) return state!;
  await prisma.providerTimeOff.create({
    data: {
      providerId: user.providerId,
      date: toDateOnly(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason ?? null,
    },
  });
  revalidatePath("/provider/calendar");
  return { ok: true, message: "Time off added." };
}

export async function removeTimeOffAction(id: string): Promise<void> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) return;
  await prisma.providerTimeOff.deleteMany({ where: { id, providerId: user.providerId } });
  revalidatePath("/provider/calendar");
}

export async function saveProviderServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) return { ok: false, error: "Provider profile not found." };
  const { data, state } = parseForm(providerServiceSchema, formData);
  if (!data) return state!;
  await prisma.providerService.upsert({
    where: { providerId_serviceId: { providerId: user.providerId, serviceId: data.serviceId } },
    create: { providerId: user.providerId, ...data },
    update: { price: data.price, experienceYears: data.experienceYears, expertiseLevel: data.expertiseLevel },
  });
  revalidatePath("/provider/services");
  return { ok: true, message: "Service saved." };
}

export async function removeProviderServiceAction(serviceId: string): Promise<void> {
  const user = await requireRole("PROVIDER");
  if (!user.providerId) return;
  await prisma.providerService.deleteMany({ where: { providerId: user.providerId, serviceId } });
  revalidatePath("/provider/services");
}
