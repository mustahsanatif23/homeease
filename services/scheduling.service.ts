import "server-only";
import { prisma } from "@/lib/db";
import { generateSlots, rangesOverlap, toMinutes, toHHMM } from "@/lib/core.mjs";
import { toDateOnly } from "@/lib/format";

/** Booking statuses that occupy a provider's calendar. */
export const BLOCKING_STATUSES = ["REQUESTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULED"];

export interface Slot { start: string; end: string }

export function endTimeFor(startTime: string, durationMinutes: number): string {
  return toHHMM(toMinutes(startTime) + durationMinutes);
}

export async function getWorkingWindow(providerId: string, date: Date): Promise<Slot | null> {
  const row = await prisma.providerAvailability.findUnique({
    where: { providerId_dayOfWeek: { providerId, dayOfWeek: date.getUTCDay() } },
  });
  if (!row || !row.isAvailable) return null;
  return { start: row.startTime, end: row.endTime };
}

export async function getTimeOff(providerId: string, date: Date) {
  return prisma.providerTimeOff.findMany({ where: { providerId, date: toDateOnly(date) } });
}

export async function getDayBookings(providerId: string, date: Date) {
  return prisma.booking.findMany({
    where: { providerId, scheduledDate: toDateOnly(date), status: { in: BLOCKING_STATUSES } },
    select: { id: true, startTime: true, endTime: true, status: true },
  });
}

/** Slot is free when it sits inside the working window and clashes with nothing. */
export async function isSlotFree(
  providerId: string,
  date: Date,
  startTime: string,
  endTime: string,
): Promise<boolean> {
  const window = await getWorkingWindow(providerId, date);
  if (!window) return false;
  if (toMinutes(startTime) < toMinutes(window.start) || toMinutes(endTime) > toMinutes(window.end)) return false;

  const [timeOff, bookings] = await Promise.all([
    getTimeOff(providerId, date),
    getDayBookings(providerId, date),
  ]);
  if (timeOff.some((t) => rangesOverlap(startTime, endTime, t.startTime, t.endTime))) return false;
  if (bookings.some((b) => rangesOverlap(startTime, endTime, b.startTime, b.endTime))) return false;
  return true;
}

/** All bookable slots for a provider on a date, for a given service duration. */
export async function getAvailableSlots(
  providerId: string,
  date: Date,
  durationMinutes: number,
): Promise<Slot[]> {
  const window = await getWorkingWindow(providerId, date);
  if (!window) return [];
  const [timeOff, bookings] = await Promise.all([
    getTimeOff(providerId, date),
    getDayBookings(providerId, date),
  ]);
  return generateSlots(window.start, window.end, durationMinutes).filter(
    (slot: Slot) =>
      !timeOff.some((t) => rangesOverlap(slot.start, slot.end, t.startTime, t.endTime)) &&
      !bookings.some((b) => rangesOverlap(slot.start, slot.end, b.startTime, b.endTime)),
  );
}

/** Bulk variant used by the matching engine so it stays at O(1) queries. */
export async function loadCalendars(providerIds: string[], date: Date) {
  const dayOfWeek = date.getUTCDay();
  const dateOnly = toDateOnly(date);
  const [availability, timeOff, bookings] = await Promise.all([
    prisma.providerAvailability.findMany({ where: { providerId: { in: providerIds }, dayOfWeek } }),
    prisma.providerTimeOff.findMany({ where: { providerId: { in: providerIds }, date: dateOnly } }),
    prisma.booking.findMany({
      where: { providerId: { in: providerIds }, scheduledDate: dateOnly, status: { in: BLOCKING_STATUSES } },
      select: { providerId: true, startTime: true, endTime: true },
    }),
  ]);

  const map = new Map<string, { window: Slot | null; timeOff: Slot[]; bookings: Slot[] }>();
  for (const id of providerIds) map.set(id, { window: null, timeOff: [], bookings: [] });
  for (const a of availability) {
    if (a.isAvailable) map.get(a.providerId)!.window = { start: a.startTime, end: a.endTime };
  }
  for (const t of timeOff) map.get(t.providerId)?.timeOff.push({ start: t.startTime, end: t.endTime });
  for (const b of bookings) map.get(b.providerId)?.bookings.push({ start: b.startTime, end: b.endTime });
  return map;
}

export function slotFreeInCalendar(
  calendar: { window: Slot | null; timeOff: Slot[]; bookings: Slot[] } | undefined,
  startTime: string,
  endTime: string,
): boolean {
  if (!calendar?.window) return false;
  if (toMinutes(startTime) < toMinutes(calendar.window.start)) return false;
  if (toMinutes(endTime) > toMinutes(calendar.window.end)) return false;
  if (calendar.timeOff.some((t) => rangesOverlap(startTime, endTime, t.start, t.end))) return false;
  if (calendar.bookings.some((b) => rangesOverlap(startTime, endTime, b.start, b.end))) return false;
  return true;
}

export function alternativeSlotInCalendar(
  calendar: { window: Slot | null; timeOff: Slot[]; bookings: Slot[] } | undefined,
  durationMinutes: number,
): Slot | null {
  if (!calendar?.window) return null;
  const slots = generateSlots(calendar.window.start, calendar.window.end, durationMinutes) as Slot[];
  for (const slot of slots) {
    if (calendar.timeOff.some((t) => rangesOverlap(slot.start, slot.end, t.start, t.end))) continue;
    if (calendar.bookings.some((b) => rangesOverlap(slot.start, slot.end, b.start, b.end))) continue;
    return slot;
  }
  return null;
}
