import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ViewProof — Accountable property viewings",
  description:
    "WhatsApp-first viewing workflow: clear cards, named agents, OTP check-in, receipts.",
  manifest: "/manifest.json",
  openGraph: {
    title: "ViewProof",
    description: "Clear information creates confident viewings.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#177E5C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
