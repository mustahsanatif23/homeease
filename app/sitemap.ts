import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const services = await prisma.service
    .findMany({ where: { active: true }, select: { slug: true, updatedAt: true } })
    .catch(() => []);
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/services`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/login`, priority: 0.4 },
    { url: `${base}/register`, priority: 0.5 },
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, lastModified: s.updatedAt, priority: 0.6 })),
  ];
}
