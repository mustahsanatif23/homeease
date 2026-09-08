import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "@/services/notification.service";
import { recordAudit } from "@/services/audit.service";
import { NotFoundError } from "@/lib/errors";
import type { VerificationStatus } from "@/lib/constants";

export async function getProviderDashboard(providerId: string) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [profile, incoming, todayJobs, upcoming, completedCount, reviews] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { user: true, services: { include: { service: true } } },
    }),
    prisma.booking.findMany({
      where: { providerId, status: "REQUESTED" },
      include: {
        request: { include: { service: true } },
        customer: { select: { name: true, avatar: true, phone: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.booking.findMany({
      where: { providerId, scheduledDate: today, status: { in: ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"] } },
      include: { request: { include: { service: true } }, customer: { select: { name: true, phone: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: { providerId, scheduledDate: { gt: today }, status: { in: ["ACCEPTED", "RESCHEDULED"] } },
      include: { request: { include: { service: true } }, customer: { select: { name: true } } },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: 8,
    }),
    prisma.booking.count({ where: { providerId, status: "COMPLETED" } }),
    prisma.review.findMany({
      where: { providerId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  if (!profile) throw new NotFoundError();
  return { profile, incoming, todayJobs, upcoming, completedCount, reviews };
}

export async function getProviderEarnings(providerId: string) {
  const completed = await prisma.booking.findMany({
    where: { providerId, status: "COMPLETED" },
    include: { invoice: true, request: { include: { service: true } } },
    orderBy: { completedAt: "desc" },
  });
  const total = completed.reduce((sum, b) => sum + (b.invoice?.total ?? b.price), 0);
  const paid = completed
    .filter((b) => b.invoice?.paymentStatus === "PAID")
    .reduce((sum, b) => sum + (b.invoice?.total ?? 0), 0);

  const byMonth = new Map<string, number>();
  for (const b of completed) {
    const key = (b.completedAt ?? b.scheduledDate).toISOString().slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + (b.invoice?.total ?? b.price));
  }
  return {
    completed,
    total,
    paid,
    pending: total - paid,
    monthly: [...byMonth.entries()].sort().map(([month, amount]) => ({ month, amount })),
  };
}

export async function setVerification(params: {
  providerId: string;
  status: VerificationStatus;
  adminId: string;
  reason?: string;
}) {
  const provider = await prisma.providerProfile.update({
    where: { id: params.providerId },
    data: {
      verificationStatus: params.status,
      verifiedAt: params.status === "APPROVED" ? new Date() : null,
      rejectionReason: params.status === "REJECTED" ? params.reason ?? "Did not meet our requirements" : null,
    },
    include: { user: true },
  });

  await prisma.user.update({
    where: { id: provider.userId },
    data: { accountStatus: params.status === "APPROVED" ? "ACTIVE" : params.status === "SUSPENDED" ? "SUSPENDED" : "PENDING" },
  });

  const copy: Record<string, { title: string; message: string }> = {
    APPROVED: { title: "You're approved", message: "Your profile is live. You can now receive job requests." },
    REJECTED: { title: "Application declined", message: params.reason ?? "Your application was not approved." },
    SUSPENDED: { title: "Account suspended", message: "Your provider account has been suspended." },
    PENDING: { title: "Verification pending", message: "Your profile is under review again." },
  };
  await notify({
    userId: provider.userId,
    type: params.status === "APPROVED" ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED",
    title: copy[params.status]!.title,
    message: copy[params.status]!.message,
  });
  await recordAudit({
    userId: params.adminId,
    action: `PROVIDER_${params.status}`,
    entity: "ProviderProfile",
    entityId: params.providerId,
    metadata: { reason: params.reason },
  });
  return provider;
}

export async function getPublicProvider(providerId: string) {
  return prisma.providerProfile.findFirst({
    where: { id: providerId, verificationStatus: "APPROVED" },
    include: {
      user: { select: { name: true, avatar: true, area: true } },
      services: { include: { service: { include: { category: true } } } },
      availability: { orderBy: { dayOfWeek: "asc" } },
      reviews: {
        include: { customer: { select: { name: true } }, booking: { include: { request: { include: { service: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}
