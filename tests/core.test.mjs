import test from "node:test";
import assert from "node:assert/strict";
import {
  haversineKm, etaMinutes, toMinutes, toHHMM, rangesOverlap, generateSlots,
  canTransition, canActorTransition, distanceScore, availabilityScore, ratingScore,
  priceScore, workloadScore, resolveWeights, computeMatchScore, computePricing,
  recalculateRating, invoiceNumber, EXPERTISE_SCORE,
} from "../lib/core.mjs";

test("haversine: identical points are 0 km", () => {
  assert.equal(haversineKm(23.74, 90.37, 23.74, 90.37), 0);
});

test("haversine: Dhanmondi -> Gulshan is roughly 5-8 km", () => {
  const d = haversineKm(23.7461, 90.3742, 23.7925, 90.4078);
  assert.ok(d > 4 && d < 9, `got ${d}`);
});

test("haversine is symmetric", () => {
  const a = haversineKm(23.74, 90.37, 23.87, 90.40);
  const b = haversineKm(23.87, 90.40, 23.74, 90.37);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test("eta grows with distance and has a floor", () => {
  assert.ok(etaMinutes(0) >= 5);
  assert.ok(etaMinutes(10) > etaMinutes(2));
});

test("time helpers round-trip", () => {
  assert.equal(toMinutes("09:30"), 570);
  assert.equal(toHHMM(570), "09:30");
  assert.equal(toHHMM(0), "00:00");
});

test("overlap detection", () => {
  assert.ok(rangesOverlap("09:00", "11:00", "10:00", "12:00"));
  assert.ok(!rangesOverlap("09:00", "10:00", "10:00", "11:00")); // back-to-back is fine
  assert.ok(rangesOverlap("09:00", "17:00", "12:00", "13:00"));  // contained
});

test("slot generation respects duration and window", () => {
  const slots = generateSlots("09:00", "12:00", 60);
  assert.deepEqual(slots[0], { start: "09:00", end: "10:00" });
  assert.equal(slots.at(-1).end, "12:00");
  assert.equal(generateSlots("09:00", "09:30", 60).length, 0);
});

test("state machine: valid provider workflow", () => {
  assert.ok(canTransition("REQUESTED", "ACCEPTED"));
  assert.ok(canTransition("ACCEPTED", "ON_THE_WAY"));
  assert.ok(canTransition("ON_THE_WAY", "IN_PROGRESS"));
  assert.ok(canTransition("IN_PROGRESS", "COMPLETED"));
});

test("state machine: invalid transitions rejected", () => {
  assert.ok(!canTransition("COMPLETED", "IN_PROGRESS"));
  assert.ok(!canTransition("REQUESTED", "IN_PROGRESS"));
  assert.ok(!canTransition("CANCELLED", "ACCEPTED"));
  assert.ok(!canTransition("REJECTED", "IN_PROGRESS"));
  assert.ok(!canTransition("COMPLETED", "CANCELLED"));
});

test("state machine: actor rules", () => {
  assert.ok(canActorTransition("PROVIDER", "ACCEPTED"));
  assert.ok(!canActorTransition("CUSTOMER", "ACCEPTED"));
  assert.ok(canActorTransition("CUSTOMER", "CANCELLED"));
  assert.ok(canActorTransition("ADMIN", "COMPLETED"));
});

test("distance score decays and clamps", () => {
  assert.equal(distanceScore(0, 15), 1);
  assert.ok(distanceScore(20, 15) === 0);
  assert.ok(distanceScore(3, 15) > distanceScore(9, 15));
});

test("availability score tiers", () => {
  assert.equal(availabilityScore({ exactSlotFree: true }), 1);
  assert.equal(availabilityScore({ sameDayAlternative: true }), 0.6);
  assert.equal(availabilityScore({ dayAvailable: true }), 0.3);
  assert.equal(availabilityScore({}), 0);
});

test("rating score: new providers are not buried", () => {
  assert.equal(ratingScore(0, 0), 0.6);
  assert.ok(ratingScore(5, 50) > ratingScore(3, 50));
  assert.ok(ratingScore(5, 50) > ratingScore(5, 1));
});

test("price score favours cheaper providers", () => {
  assert.ok(priceScore(800, 1000) > priceScore(1200, 1000));
  assert.equal(priceScore(2000, 1000), 0);
});

test("workload score penalises busy providers", () => {
  const idle = workloadScore({ activeJobs: 0, todayJobs: 0, acceptanceRate: 0.9 });
  const busy = workloadScore({ activeJobs: 4, todayJobs: 3, acceptanceRate: 0.9 });
  assert.ok(idle > busy);
});

test("weights always normalise to 100", () => {
  for (const u of ["NORMAL", "HIGH", "URGENT"]) {
    const w = resolveWeights({ availabilityWeight: 30, distanceWeight: 20, ratingWeight: 20, priceWeight: 15, expertiseWeight: 10, workloadWeight: 5, urgencyDistanceMultiplier: 1.5, urgencyAvailabilityMultiplier: 1.4 }, u);
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 100) < 1e-9, `${u} total ${total}`);
  }
});

test("urgent requests weight availability and distance more", () => {
  const cfg = { availabilityWeight: 30, distanceWeight: 20, ratingWeight: 20, priceWeight: 15, expertiseWeight: 10, workloadWeight: 5, urgencyDistanceMultiplier: 1.5, urgencyAvailabilityMultiplier: 1.4 };
  const normal = resolveWeights(cfg, "NORMAL");
  const urgent = resolveWeights(cfg, "URGENT");
  assert.ok(urgent.availability > normal.availability);
  assert.ok(urgent.distance > normal.distance);
  assert.ok(urgent.price < normal.price);
});

test("urgent matching prefers the near, available provider over the cheap far one", () => {
  const cfg = { availabilityWeight: 30, distanceWeight: 20, ratingWeight: 20, priceWeight: 15, expertiseWeight: 10, workloadWeight: 5, urgencyDistanceMultiplier: 1.5, urgencyAvailabilityMultiplier: 1.4 };
  const near = { availability: 1, distance: 0.9, rating: 0.7, price: 0.4, expertise: 0.65, workload: 0.8 };
  const farCheap = { availability: 0.6, distance: 0.2, rating: 0.8, price: 1, expertise: 0.85, workload: 0.9 };
  assert.ok(computeMatchScore(near, cfg, "URGENT") > computeMatchScore(farCheap, cfg, "URGENT"));
});

test("match score is bounded 0..100", () => {
  const perfect = { availability: 1, distance: 1, rating: 1, price: 1, expertise: 1, workload: 1 };
  const worst = { availability: 0, distance: 0, rating: 0, price: 0, expertise: 0, workload: 0 };
  assert.equal(computeMatchScore(perfect), 100);
  assert.equal(computeMatchScore(worst), 0);
});

test("expertise ladder is ordered", () => {
  assert.ok(EXPERTISE_SCORE.EXPERT > EXPERTISE_SCORE.ADVANCED);
  assert.ok(EXPERTISE_SCORE.ADVANCED > EXPERTISE_SCORE.INTERMEDIATE);
  assert.ok(EXPERTISE_SCORE.INTERMEDIATE > EXPERTISE_SCORE.BEGINNER);
});

test("invoice totals add up", () => {
  const p = computePricing({ providerPrice: 1000, distanceKm: 8, urgency: "URGENT" });
  assert.equal(p.subtotal, 1000);
  assert.equal(p.serviceFee, 100);
  assert.equal(p.urgencyFee, 200);
  assert.equal(p.distanceFee, 100); // (8 - 3 free) * 20
  assert.equal(p.total, 1400);
});

test("normal urgency has no urgency fee, discount is applied", () => {
  const p = computePricing({ providerPrice: 1500, distanceKm: 2, urgency: "NORMAL", discount: 150 });
  assert.equal(p.urgencyFee, 0);
  assert.equal(p.distanceFee, 0);
  assert.equal(p.total, 1500 + 150 - 150);
});

test("rating recalculation is an incremental mean", () => {
  const r1 = recalculateRating(0, 0, 5);
  assert.deepEqual(r1, { rating: 5, ratingCount: 1 });
  const r2 = recalculateRating(4, 3, 5);
  assert.equal(r2.ratingCount, 4);
  assert.equal(r2.rating, 4.25);
});

test("invoice numbers are formatted and padded", () => {
  assert.equal(invoiceNumber(7, new Date("2026-02-11T00:00:00Z")), "SS-202602-00007");
});
