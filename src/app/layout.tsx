import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/Providers";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "TrustBridge Dashboard",
    template: "%s | TrustBridge",
  },
  description:
    "Register your Stellar address for TrustBridge Wave payouts. Maintainers track contributor readiness across GitHub and Stellar.",
  keywords: [
    "TrustBridge",
    "Stellar",
    "USDC",
    "open source",
    "contributor payouts",
    "GitHub",
  ],
  openGraph: {
    title: "TrustBridge Dashboard",
    description:
      "GitHub → Stellar address mapping with live trustline validation for Wave payouts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
