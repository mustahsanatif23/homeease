// HomeEase — pure business logic core.
// Plain ESM so it can be unit-tested with `node --test` (no build step, no deps)
// and imported by the TypeScript service layer.

/* ------------------------------------------------------------------ geo -- */

/** Great-circle distance in km between two coordinates (Haversine). */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Rough city ETA: 18 km/h average + 8 min dispatch overhead. */
export function etaMinutes(distanceKm) {
  return Math.max(5, Math.round((distanceKm / 18) * 60 + 8));
}

/* ----------------------------------------------------------------- time -- */

export function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/** Slot generation on a 30-minute grid inside a working window. */
export function generateSlots(startTime, endTime, durationMinutes, stepMinutes = 30) {
  const slots = [];
  const end = toMinutes(endTime);
  for (let t = toMinutes(startTime); t + durationMinutes <= end; t += stepMinutes) {
    slots.push({ start: toHHMM(t), end: toHHMM(t + durationMinutes) });
  }
  return slots;
}

/* ------------------------------------------------------- state machine -- */

export const BOOKING_TRANSITIONS = {
  REQUESTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["ON_THE_WAY", "CANCELLED", "RESCHEDULED"],
  ON_THE_WAY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  RESCHEDULED: ["ACCEPTED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function canTransition(from, to) {
  return (BOOKING_TRANSITIONS[from] || []).includes(to);
}

/** Roles allowed to perform a given transition. */
export const TRANSITION_ACTORS = {
  ACCEPTED: ["PROVIDER", "ADMIN"],
  REJECTED: ["PROVIDER", "ADMIN"],
  ON_THE_WAY: ["PROVIDER", "ADMIN"],
  IN_PROGRESS: ["PROVIDER", "ADMIN"],
  COMPLETED: ["PROVIDER", "ADMIN"],
  CANCELLED: ["CUSTOMER", "PROVIDER", "ADMIN"],
  RESCHEDULED: ["PROVIDER", "ADMIN"],
};

export function canActorTransition(role, to) {
  return (TRANSITION_ACTORS[to] || []).includes(role);
}

/* ------------------------------------------------------------ matching -- */

export const DEFAULT_WEIGHTS = {
  availabilityWeight: 30,
  distanceWeight: 20,
  ratingWeight: 20,
  priceWeight: 15,
  expertiseWeight: 10,
  workloadWeight: 5,
  urgencyDistanceMultiplier: 1.5,
  urgencyAvailabilityMultiplier: 1.4,
};

export const EXPERTISE_SCORE = {
  BEGINNER: 0.4,
  INTERMEDIATE: 0.65,
  ADVANCED: 0.85,
  EXPERT: 1,
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

/** 1.0 at 0 km, decays linearly to 0 at `radiusKm`. */
export function distanceScore(distanceKm, radiusKm = 15) {
  return clamp01(1 - distanceKm / radiusKm);
}

/**
 * Availability: exact requested slot free = 1.0, same-day alternative = 0.6,
 * only nearby-day availability = 0.3.
 */
export function availabilityScore({ exactSlotFree, sameDayAlternative, dayAvailable }) {
  if (exactSlotFree) return 1;
  if (sameDayAlternative) return 0.6;
  if (dayAvailable) return 0.3;
  return 0;
}

/** New providers get a neutral 0.6 instead of a 0 that would bury them forever. */
export function ratingScore(rating, ratingCount) {
  if (!ratingCount) return 0.6;
  const confidence = Math.min(1, ratingCount / 10);
  const normalised = clamp01((rating - 1) / 4);
  return normalised * confidence + 0.6 * (1 - confidence);
}

/** Cheaper than the base price scores 1, twice the base price scores 0. */
export function priceScore(providerPrice, basePrice) {
  if (!basePrice) return 0.5;
  return clamp01(1 - (providerPrice - basePrice) / basePrice);
}

/** Fewer active jobs and a healthy acceptance rate score higher. */
export function workloadScore({ activeJobs, todayJobs, acceptanceRate = 0.8 }) {
  const load = clamp01(1 - (activeJobs * 0.15 + todayJobs * 0.1));
  return clamp01(load * 0.75 + acceptanceRate * 0.25);
}

/**
 * Applies urgency multipliers to availability/distance and re-normalises so the
 * weights always total 100.
 */
export function resolveWeights(config, urgency) {
  const w = {
    availability: config.availabilityWeight,
    distance: config.distanceWeight,
    rating: config.ratingWeight,
    price: config.priceWeight,
    expertise: config.expertiseWeight,
    workload: config.workloadWeight,
  };
  if (urgency === "URGENT" || urgency === "HIGH") {
    const strength = urgency === "URGENT" ? 1 : 0.5;
    const am = 1 + (config.urgencyAvailabilityMultiplier - 1) * strength;
    const dm = 1 + (config.urgencyDistanceMultiplier - 1) * strength;
    w.availability *= am;
    w.distance *= dm;
  }
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(w)) w[k] = (w[k] / total) * 100;
  return w;
}

/**
 * Weighted match score in 0..100.
 * scores = { availability, distance, rating, price, expertise, workload } (0..1)
 */
export function computeMatchScore(scores, config = DEFAULT_WEIGHTS, urgency = "NORMAL") {
  const w = resolveWeights(config, urgency);
  const score =
    clamp01(scores.availability) * w.availability +
    clamp01(scores.distance) * w.distance +
    clamp01(scores.rating) * w.rating +
    clamp01(scores.price) * w.price +
    clamp01(scores.expertise) * w.expertise +
    clamp01(scores.workload) * w.workload;
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/* ------------------------------------------------------------- pricing -- */

/**
 * Estimated / final price breakdown. All amounts are whole BDT.
 * urgency: NORMAL (0%) | HIGH (half of urgencyFeePercent) | URGENT (full).
 */
export function computePricing({
  providerPrice,
  distanceKm = 0,
  urgency = "NORMAL",
  serviceFeePercent = 10,
  urgencyFeePercent = 20,
  distanceFeePerKm = 20,
  freeDistanceKm = 3,
  discount = 0,
}) {
  const subtotal = Math.round(providerPrice);
  const serviceFee = Math.round((subtotal * serviceFeePercent) / 100);
  const urgencyMultiplier = urgency === "URGENT" ? 1 : urgency === "HIGH" ? 0.5 : 0;
  const urgencyFee = Math.round((subtotal * urgencyFeePercent * urgencyMultiplier) / 100);
  const billableKm = Math.max(0, distanceKm - freeDistanceKm);
  const distanceFee = Math.round(billableKm * distanceFeePerKm);
  const total = Math.max(0, subtotal + serviceFee + urgencyFee + distanceFee - discount);
  return { subtotal, serviceFee, urgencyFee, distanceFee, discount, total };
}

/* -------------------------------------------------------------- rating -- */

export function recalculateRating(currentRating, currentCount, newRating) {
  const count = currentCount + 1;
  const rating = (currentRating * currentCount + newRating) / count;
  return { rating: Math.round(rating * 100) / 100, ratingCount: count };
}

/* --------------------------------------------------------------- misc --- */

export function invoiceNumber(sequence, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `SS-${y}${m}-${String(sequence).padStart(5, "0")}`;
}

export function matchReasons({ exactSlotFree, distanceKm, rating, ratingCount, completedJobs, expertiseLevel, serviceName, price, eta }) {
  const r = [];
  r.push(exactSlotFree ? "Available at your requested time" : "Available on your preferred day");
  r.push(`${distanceKm.toFixed(1)} km away · about ${eta} min to arrive`);
  r.push(ratingCount ? `${rating.toFixed(1)}★ from ${ratingCount} reviews` : "New on HomeEase — verified professional");
  r.push(`${completedJobs} completed jobs`);
  r.push(`${expertiseLevel.charAt(0) + expertiseLevel.slice(1).toLowerCase()} in ${serviceName}`);
  r.push(`Estimated price ৳${price.toLocaleString("en-US")}`);
  return r;
}
