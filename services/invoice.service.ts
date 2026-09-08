import "server-only";
import { prisma } from "@/lib/db";
import { computePricing, invoiceNumber, haversineKm } from "@/lib/core.mjs";
import { getMatchingConfig } from "@/services/config.service";
import { notify } from "@/services/notification.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Role } from "@/lib/constants";

/** Idempotent: a booking can only ever have one invoice. */
export async function generateInvoice(bookingId: string) {
  const existing = await prisma.invoice.findUnique({ where: { bookingId } });
  if (existing) return existing;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      request: { include: { service: true } },
      provider: { include: { user: true, services: true } },
    },
  });
  if (!booking) throw new NotFoundError();

  const config = await getMatchingConfig();
  const offer = booking.provider.services.find((s) => s.serviceId === booking.request.serviceId);
  const providerPrice = offer?.price ?? booking.request.service.basePrice;
  const distanceKm =
    booking.provider.user.latitude != null && booking.provider.user.longitude != null
      ? haversineKm(
          booking.request.latitude, booking.request.longitude,
          booking.provider.user.latitude, booking.provider.user.longitude,
        )
      : 0;

  const breakdown = computePricing({
    providerPrice,
    distanceKm,
    urgency: booking.request.urgency,
    serviceFeePercent: config.serviceFeePercent,
    urgencyFeePercent: config.urgencyFeePercent,
    distanceFeePerKm: config.distanceFeePerKm,
  });

  const count = await prisma.invoice.count();
  const invoice = await prisma.invoice.create({
    data: {
      bookingId,
      invoiceNumber: invoiceNumber(count + 1),
      subtotal: breakdown.subtotal,
      serviceFee: breakdown.serviceFee,
      urgencyFee: breakdown.urgencyFee,
      distanceFee: breakdown.distanceFee,
      discount: breakdown.discount,
      total: breakdown.total,
      paymentStatus: "UNPAID",
    },
  });

  await prisma.booking.update({ where: { id: bookingId }, data: { price: breakdown.total } });
  await notify({
    userId: booking.customerId,
    type: "INVOICE_GENERATED",
    title: "Invoice ready",
    message: `Invoice ${invoice.invoiceNumber} for ৳${breakdown.total.toLocaleString("en-US")} is ready.`,
    requestId: booking.requestId,
    bookingId,
  });
  return invoice;
}

export async function getInvoiceForUser(invoiceId: string, userId: string, role: Role) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      booking: {
        include: {
          request: { include: { service: true } },
          customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
          provider: { include: { user: { select: { name: true, phone: true } } } },
        },
      },
    },
  });
  if (!invoice) throw new NotFoundError("We couldn't find that invoice.");
  if (role === "CUSTOMER" && invoice.booking.customerId !== userId) throw new ForbiddenError();
  if (role === "PROVIDER" && invoice.booking.provider.userId !== userId) throw new ForbiddenError();
  return invoice;
}

export async function listCustomerInvoices(customerId: string) {
  return prisma.invoice.findMany({
    where: { booking: { customerId } },
    include: { booking: { include: { request: { include: { service: true } }, provider: true } } },
    orderBy: { issuedAt: "desc" },
  });
}

export async function markInvoicePaid(invoiceId: string) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });
}
