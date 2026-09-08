import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "HomeEase — Smart Service. Better Living.",
    template: "%s · HomeEase",
  },
  description:
    "Find trusted service professionals, compare smart recommendations, schedule instantly, and track every job from request to completion.",
  applicationName: "HomeEase",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "HomeEase — Smart Service. Better Living.",
    description: "Smart matching, instant scheduling and live tracking for home services.",
    type: "website",
    images: ["/logo.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#14161a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
