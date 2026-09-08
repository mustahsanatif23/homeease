import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ padding: "90px 20px", textAlign: "center" }}>
      <h1>We couldn&apos;t find that page</h1>
      <p className="muted" style={{ margin: "10px 0 22px" }}>The link may be broken or the page may have moved.</p>
      <Link href="/" className="btn">Back to home</Link>
    </main>
  );
}
