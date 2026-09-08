import "server-only";
import { computePricing } from "@/lib/core.mjs";
import { getMatchingConfig } from "@/services/config.service";
import type { Urgency } from "@/lib/constants";

export interface PriceBreakdown {
  subtotal: number;
  serviceFee: number;
  urgencyFee: number;
  distanceFee: number;
  discount: number;
  total: number;
}

export async function estimatePrice(params: {
  providerPrice: number;
  distanceKm: number;
  urgency: Urgency;
  discount?: number;
}): Promise<PriceBreakdown> {
  const config = await getMatchingConfig();
  return computePricing({
    providerPrice: params.providerPrice,
    distanceKm: params.distanceKm,
    urgency: params.urgency,
    serviceFeePercent: config.serviceFeePercent,
    urgencyFeePercent: config.urgencyFeePercent,
    distanceFeePerKm: config.distanceFeePerKm,
    discount: params.discount ?? 0,
  });
}
