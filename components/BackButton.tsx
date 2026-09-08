"use client";

import { useRouter } from "next/navigation";

/**
 * Goes back in history when there is somewhere to go back to, and falls back to
 * a sensible route when the page was opened directly (a shared link, a refresh).
 */
export default function BackButton({ fallback = "/", label = "Back", className = "btn-secondary btn-sm" }: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`btn ${className}`}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      ← {label}
    </button>
  );
}
