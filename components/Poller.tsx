"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Live status without a websocket server: revalidates the server components on
 * an interval. Swapping in a socket later only changes this file.
 */
export default function Poller({ intervalMs = 8000, enabled = true }: { intervalMs?: number; enabled?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, enabled]);
  return null;
}
