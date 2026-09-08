"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container" style={{ padding: "90px 20px", textAlign: "center" }}>
      <h1>Something went wrong</h1>
      <p className="muted" style={{ margin: "10px 0 22px" }}>
        The page couldn&apos;t load. Please try again — nothing was lost.
      </p>
      <button className="btn" onClick={reset}>Try again</button>
    </main>
  );
}
