import Link from "next/link";

/** Full lock-up: house mark + "HomeEase" wordmark. */
export function Logo({ href = "/", height = 30 }: { href?: string | null; height?: number }) {
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="HomeEase — Smart Service. Better Living." className="brand-logo" style={{ height }} />
  );
  return href ? <Link href={href} aria-label="HomeEase home">{image}</Link> : image;
}

/** Just the house mark, for tight spaces. */
export function Mark({ size = 30 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/mark.png" alt="" aria-hidden="true" className="brand-mark" style={{ height: size, width: size }} />;
}
