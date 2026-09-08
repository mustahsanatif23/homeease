import "server-only";
import { prisma } from "@/lib/db";

const DEFAULTS = {
  id: "default",
  availabilityWeight: 30,
  distanceWeight: 20,
  ratingWeight: 20,
  priceWeight: 15,
  expertiseWeight: 10,
  workloadWeight: 5,
  urgencyDistanceMultiplier: 1.5,
  urgencyAvailabilityMultiplier: 1.4,
  serviceFeePercent: 10,
  urgencyFeePercent: 20,
  distanceFeePerKm: 20,
};

export type MatchingConfig = typeof DEFAULTS & { updatedAt?: Date };

/** Always returns a usable configuration, creating the row on first use. */
export async function getMatchingConfig(): Promise<MatchingConfig> {
  const existing = await prisma.matchingConfiguration.findUnique({ where: { id: "default" } });
  if (existing) return existing as MatchingConfig;
  const created = await prisma.matchingConfiguration.create({ data: DEFAULTS });
  return created as MatchingConfig;
}

export async function updateMatchingConfig(data: Partial<MatchingConfig>) {
  return prisma.matchingConfiguration.upsert({
    where: { id: "default" },
    create: { ...DEFAULTS, ...data },
    update: data,
  });
}

export const RECOMMENDED_CONFIG = DEFAULTS;
