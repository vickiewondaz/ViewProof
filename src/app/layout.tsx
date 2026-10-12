import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/site-header";
import InstallPrompt from "@/components/install-prompt";

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
  themeColor: "#177E5C",
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
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <div className="px-3 pt-3">
          <InstallPrompt />
        </div>
        {children}
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 text-center text-[14px] text-slate-500">
          ViewProof · honest viewings · we don&apos;t verify title or ownership
        </footer>
      </body>
    </html>
  );
}
