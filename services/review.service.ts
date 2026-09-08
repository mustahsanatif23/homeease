import "server-only";
import { prisma } from "@/lib/db";
import { recalculateRating } from "@/lib/core.mjs";
import { notify } from "@/services/notification.service";
import { recordAudit } from "@/services/audit.service";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { z } from "zod";
import type { reviewSchema } from "@/schemas";

export async function createReview(customerId: string, input: z.infer<typeof reviewSchema>) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { review: true, provider: true },
  });
  if (!booking) throw new NotFoundError();
  if (booking.customerId !== customerId) throw new ForbiddenError();
  if (booking.status !== "COMPLETED") throw new AppError("You can review a job once it's completed.");
  if (booking.review) throw new AppError("You've already reviewed this job.");

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: booking.id,
        customerId,
        providerId: booking.providerId,
        rating: input.rating,
        qualityRating: input.qualityRating ?? null,
        professionalismRating: input.professionalismRating ?? null,
        punctualityRating: input.punctualityRating ?? null,
        valueRating: input.valueRating ?? null,
        comment: input.comment?.trim() || null,
      },
    });

    const provider = await tx.providerProfile.findUniqueOrThrow({ where: { id: booking.providerId } });
    const next = recalculateRating(provider.rating, provider.ratingCount, input.rating);
    await tx.providerProfile.update({
      where: { id: provider.id },
      data: { rating: next.rating, ratingCount: next.ratingCount },
    });
    return created;
  });

  await notify({
    userId: booking.provider.userId,
    type: "REVIEW_RECEIVED",
    title: "New review",
    message: `You received a ${input.rating}★ review.`,
    bookingId: booking.id,
  });
  await recordAudit({ userId: customerId, action: "REVIEW_CREATED", entity: "Review", entityId: review.id });
  return review;
}

export async function listProviderReviews(providerId: string, take = 20) {
  return prisma.review.findMany({
    where: { providerId },
    include: {
      customer: { select: { name: true, avatar: true } },
      booking: { include: { request: { include: { service: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}
