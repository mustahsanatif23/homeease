import "server-only";
import { prisma } from "@/lib/db";

export type RangeKey = "today" | "7d" | "30d" | "90d" | "year";

export function rangeToDate(range: RangeKey): Date {
  const now = new Date();
  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const from = new Date(now.getTime() - (days - 1) * 86_400_000);
  from.setHours(0, 0, 0, 0);
  return from;
}

export async function getAdminOverview(range: RangeKey = "30d") {
  const from = rangeToDate(range);

  const [
    totalUsers, customers, providers, pendingProviders,
    activeRequests, completedJobs, invoices, ratingAgg, urgentCount, cancelledCount, totalRequests,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
    prisma.user.count({ where: { role: "PROVIDER", deletedAt: null } }),
    prisma.providerProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.serviceRequest.count({ where: { status: { in: ["PENDING", "MATCHED", "ASSIGNED", "BOOKED"] } } }),
    prisma.booking.count({ where: { status: "COMPLETED", createdAt: { gte: from } } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { issuedAt: { gte: from } } }),
    prisma.providerProfile.aggregate({ _avg: { rating: true }, where: { ratingCount: { gt: 0 } } }),
    prisma.serviceRequest.count({ where: { urgency: "URGENT", createdAt: { gte: from } } }),
    prisma.booking.count({ where: { status: { in: ["CANCELLED", "REJECTED"] }, createdAt: { gte: from } } }),
    prisma.serviceRequest.count({ where: { createdAt: { gte: from } } }),
  ]);

  const matchedRequests = await prisma.serviceRequest.count({
    where: { createdAt: { gte: from }, status: { not: "NO_PROVIDER" } },
  });

  return {
    totalUsers,
    customers,
    providers,
    pendingProviders,
    activeRequests,
    completedJobs,
    revenue: invoices._sum.total ?? 0,
    averageRating: Math.round((ratingAgg._avg.rating ?? 0) * 100) / 100,
    urgentCount,
    cancellationRate: completedJobs + cancelledCount > 0
      ? Math.round((cancelledCount / (completedJobs + cancelledCount)) * 1000) / 10
      : 0,
    matchingSuccessRate: totalRequests > 0 ? Math.round((matchedRequests / totalRequests) * 1000) / 10 : 100,
    totalRequests,
  };
}

export async function getRequestsSeries(range: RangeKey = "30d") {
  const from = rangeToDate(range);
  const requests = await prisma.serviceRequest.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true },
  });
  const buckets = new Map<string, number>();
  const days = Math.ceil((Date.now() - from.getTime()) / 86_400_000) + 1;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from.getTime() + i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of requests) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, value]) => ({ label: date.slice(5), value }));
}

export async function getRevenueSeries(range: RangeKey = "30d") {
  const from = rangeToDate(range);
  const invoices = await prisma.invoice.findMany({
    where: { issuedAt: { gte: from } },
    select: { issuedAt: true, total: true },
  });
  const buckets = new Map<string, number>();
  for (const inv of invoices) {
    const key = inv.issuedAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + inv.total);
  }
  return [...buckets.entries()].sort().map(([date, value]) => ({ label: date.slice(5), value }));
}

export async function getCategoryBreakdown() {
  const categories = await prisma.serviceCategory.findMany({
    include: { services: { select: { id: true, name: true } } },
  });
  const counts = await prisma.serviceRequest.groupBy({ by: ["serviceId"], _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.serviceId, c._count._all]));
  return categories
    .map((c) => ({
      label: c.name,
      value: c.services.reduce((sum, s) => sum + (countMap.get(s.id) ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value);
}

export async function getStatusBreakdown() {
  const grouped = await prisma.booking.groupBy({ by: ["status"], _count: { _all: true } });
  return grouped.map((g) => ({ label: g.status, value: g._count._all }));
}

export async function getTopProviders(take = 6) {
  return prisma.providerProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    include: { user: { select: { name: true, area: true } } },
    orderBy: [{ completedJobs: "desc" }, { rating: "desc" }],
    take,
  });
}

export async function getAverageCompletionMinutes() {
  const bookings = await prisma.booking.findMany({
    where: { status: "COMPLETED", startedAt: { not: null }, completedAt: { not: null } },
    select: { startedAt: true, completedAt: true },
    take: 200,
  });
  if (!bookings.length) return 0;
  const total = bookings.reduce(
    (sum, b) => sum + (b.completedAt!.getTime() - b.startedAt!.getTime()) / 60000, 0,
  );
  return Math.round(total / bookings.length);
}

export async function getCustomerDashboard(customerId: string) {
  const [activeRequests, upcoming, recent, favorites, spent, completed] = await Promise.all([
    prisma.serviceRequest.findMany({
      where: { customerId, status: { in: ["PENDING", "MATCHED", "ASSIGNED", "BOOKED"] } },
      include: { service: true, provider: { include: { user: { select: { name: true } } } }, bookings: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { customerId, status: { in: ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "RESCHEDULED"] } },
      include: { request: { include: { service: true } }, provider: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: 3,
    }),
    prisma.booking.findMany({
      where: { customerId, status: "COMPLETED" },
      include: { request: { include: { service: true } }, provider: true, review: true, invoice: true },
      orderBy: { completedAt: "desc" },
      take: 4,
    }),
    prisma.favoriteProvider.findMany({
      where: { customerId },
      include: { provider: { include: { user: { select: { name: true, area: true } } } } },
      take: 6,
    }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { booking: { customerId } } }),
    prisma.booking.count({ where: { customerId, status: "COMPLETED" } }),
  ]);

  return {
    activeRequests,
    upcoming,
    recent,
    favorites,
    totalSpent: spent._sum.total ?? 0,
    completed,
  };
}
