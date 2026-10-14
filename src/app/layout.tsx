import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import SiteHeader from "@/components/site-header";
import InstallPrompt from "@/components/install-prompt";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "ViewProof — Accountable property viewings",
  description:
    "WhatsApp-first viewing workflow: clear cards, named agents, OTP check-in, receipts.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "ViewProof",
    description: "Clear information creates confident viewings.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c3b2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen antialiased ${display.variable} ${sans.variable}`}>
        <SiteHeader />
        <div className="px-3 pt-3">
          <InstallPrompt />
        </div>
        {children}
        <footer className="pine-band mt-10 px-4 py-10 text-center">
          <p className="eyebrow">ViewProof</p>
          <p className="font-display mx-auto mt-2 max-w-md text-[24px] leading-snug">
            Honest viewings, kept on record.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14px] opacity-80">
            We don&apos;t verify title or ownership — we show what the agency confirmed, and who&apos;ll meet you.
          </p>
        </footer>
      </body>
    </html>
  );
}
