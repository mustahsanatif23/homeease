/**
 * In-memory fixed-window rate limiter. Swap the Map for Redis in production —
 * the call sites don't change.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 10, windowMs = 60_000): { ok: boolean; retryInSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryInSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryInSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryInSeconds: 0 };
}
