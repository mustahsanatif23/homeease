import "server-only";
import { prisma } from "@/lib/db";

export async function listCategories(includeInactive = false) {
  return prisma.serviceCategory.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { services: true } } },
  });
}

export async function listServices(categoryId?: string, includeInactive = false) {
  return prisma.service.findMany({
    where: {
      ...(categoryId ? { categoryId } : {}),
      ...(includeInactive ? {} : { active: true, category: { active: true } }),
    },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getServiceBySlug(slug: string) {
  return prisma.service.findUnique({ where: { slug }, include: { category: true } });
}

export async function popularServices(take = 6) {
  const grouped = await prisma.serviceRequest.groupBy({
    by: ["serviceId"],
    _count: { _all: true },
    orderBy: { _count: { serviceId: "desc" } },
    take,
  });
  if (grouped.length === 0) {
    return prisma.service.findMany({ where: { active: true }, include: { category: true }, take });
  }
  const services = await prisma.service.findMany({
    where: { id: { in: grouped.map((g) => g.serviceId) }, active: true },
    include: { category: true },
  });
  const order = new Map(grouped.map((g, i) => [g.serviceId, i]));
  return services.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function searchCatalog(query: string) {
  const q = query.trim();
  if (q.length < 2) return { services: [], providers: [] };
  const [services, providers] = await Promise.all([
    prisma.service.findMany({
      where: { active: true, name: { contains: q } },
      include: { category: true },
      take: 8,
    }),
    prisma.providerProfile.findMany({
      where: { verificationStatus: "APPROVED", businessName: { contains: q } },
      include: { user: { select: { name: true, area: true, avatar: true } } },
      take: 8,
    }),
  ]);
  return { services, providers };
}
